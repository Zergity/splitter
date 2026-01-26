import type { AuthEnv } from '../types/auth';
import { verifySession, getTokenFromCookies } from '../utils/jwt';

interface ReceiptsEnv extends AuthEnv {
  AI: Ai;
}

interface ReceiptItem {
  id: string;
  description: string;
  amount: number;
}

interface ExtractedData {
  items: ReceiptItem[];
  merchant?: string;
  discount?: number;
  total?: number;
  confidence: number;
}

export const onRequestPost: PagesFunction<ReceiptsEnv> = async (context) => {
  try {
    // Verify authentication
    const token = getTokenFromCookies(context.request);
    if (!token) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = await verifySession(context.env, token);
    if (!session) {
      return Response.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Get OCR text from request body
    const body = await context.request.json() as { ocrText?: string };
    const ocrText = body.ocrText;

    if (!ocrText || typeof ocrText !== 'string') {
      return Response.json(
        { success: false, error: 'No OCR text provided' },
        { status: 400 }
      );
    }

    if (ocrText.length > 10000) {
      return Response.json(
        { success: false, error: 'OCR text too long' },
        { status: 400 }
      );
    }

    // Check if AI binding is available
    if (!context.env.AI) {
      return Response.json(
        { success: false, error: 'AI binding not available' },
        { status: 500 }
      );
    }

    let extracted: ExtractedData = { items: [], confidence: 0 };

    try {
      // Use Llama text model to parse the OCR text
      const prompt = `Parse this Vietnamese receipt OCR text and extract items.

OCR TEXT:
${ocrText}

Return ONLY valid JSON:
{"items":[{"description":"Bít Tết","amount":"125.000","qty":4}],"merchant":"Store Name","discount":10,"total":"468.000"}

IMPORTANT Rules:
- items: extract each food/drink item
  - description: item name
  - amount: UNIT PRICE only (column ĐG or Đơn giá), NOT the line total
  - qty: quantity from SL column, default 1
- discount: discount PERCENTAGE as number (e.g., 10 for 10% off, 0 if no discount)
- total: final amount after discount (Tổng tiền/Tổng cộng)
- merchant: store/restaurant name from header
- Skip: table headers (STT, Tên, SL, ĐG), tax, service fee, tips
- All prices as Vietnamese format strings (e.g., "125.000")
- Return ONLY the JSON, no markdown, no explanation`;

      console.log('Calling AI with OCR text length:', ocrText.length);

      const response = await context.env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct',
        {
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 1024,
        }
      );

      console.log('AI response type:', typeof response);
      console.log('AI response:', JSON.stringify(response));

      const aiText = response && typeof response === 'object' && 'response' in response
        ? (response as { response: string }).response
        : '';
      console.log('AI text length:', aiText?.length || 0);
      console.log('AI text:', aiText);

      if (aiText) {
        try {
          // Extract JSON from response
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            // Parse discount percentage
            let discount: number | undefined;
            if (typeof parsed.discount === 'number' && parsed.discount > 0) {
              discount = parsed.discount;
            } else if (typeof parsed.discount === 'string') {
              const parsedDiscount = parseFloat(parsed.discount.replace('%', ''));
              if (!isNaN(parsedDiscount) && parsedDiscount > 0) {
                discount = parsedDiscount;
              }
            }

            // Calculate discount ratio to apply to each item
            const discountRatio = discount && discount > 0 ? (1 - discount / 100) : 1;

            // Parse items and apply discount
            const items: ReceiptItem[] = [];
            if (Array.isArray(parsed.items)) {
              for (const item of parsed.items) {
                let amount = parseVietnamesePrice(item.amount);

                // Get quantity
                let qty = 1;
                if (typeof item.qty === 'number' && item.qty > 0) {
                  qty = Math.floor(item.qty);
                } else if (typeof item.qty === 'string') {
                  const parsedQty = parseInt(item.qty, 10);
                  if (!isNaN(parsedQty) && parsedQty > 0) {
                    qty = parsedQty;
                  }
                }

                if (!isNaN(amount) && amount > 0) {
                  const description = typeof item.description === 'string'
                    ? item.description.slice(0, 40)
                    : 'Item';
                  // Apply discount ratio to each item
                  const discountedAmount = Math.round(amount * discountRatio * 100) / 100;

                  for (let i = 0; i < qty; i++) {
                    items.push({
                      id: crypto.randomUUID(),
                      description,
                      amount: discountedAmount,
                    });
                  }
                }
              }
            }

            // Parse total
            const total = parseVietnamesePrice(parsed.total);

            extracted = {
              items,
              merchant: typeof parsed.merchant === 'string' ? parsed.merchant : undefined,
              discount,
              total: !isNaN(total) && total > 0 ? Math.round(total * 100) / 100 : undefined,
              confidence: 0.8,
            };
          }
        } catch (parseError) {
          console.error('JSON parsing failed:', parseError);
          extracted.confidence = 0.1;
        }
      }
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      return Response.json(
        { success: false, error: `AI processing failed: ${errorMessage}` },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data: { extracted },
    });
  } catch (error) {
    console.error('Receipt parsing error:', error);
    return Response.json(
      { success: false, error: 'Failed to parse receipt' },
      { status: 500 }
    );
  }
};

// Parse Vietnamese price format and convert to K
function parseVietnamesePrice(value: unknown): number {
  if (typeof value === 'number') {
    return value >= 1000 ? value / 1000 : value;
  }
  if (typeof value === 'string') {
    // Remove currency symbols and whitespace
    let cleaned = value.replace(/[^\d.,]/g, '').trim();
    // Handle Vietnamese format: . as thousands separator
    if (/[.,]\d{3}$/.test(cleaned)) {
      cleaned = cleaned.replace(/[.,]/g, '');
    } else {
      cleaned = cleaned.replace(/[.,](?=\d{3})/g, '').replace(',', '.');
    }
    const num = parseFloat(cleaned);
    return !isNaN(num) && num >= 1000 ? num / 1000 : num;
  }
  return NaN;
}
