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
  date?: string;
  merchant?: string;
  total?: number;
  confidence: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    // Parse multipart form data
    const formData = await context.request.formData();
    const file = formData.get('receipt') as File | null;

    if (!file) {
      return Response.json(
        { success: false, error: 'No receipt file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { success: false, error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      );
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Process with Workers AI vision model
    let extracted: ExtractedData = { items: [], confidence: 0 };

    // Check if AI binding is available
    if (!context.env.AI) {
      return Response.json(
        { success: false, error: 'AI binding not available' },
        { status: 500 }
      );
    } else {
      try {
        // First, accept the Llama license by sending "agree"
        try {
          await context.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            prompt: 'agree',
            max_tokens: 1,
          });
        } catch {
          // License might already be accepted or this format doesn't work
        }

        // Use Llama 3.2 Vision model
        const response = await context.env.AI.run(
          '@cf/meta/llama-3.2-11b-vision-instruct',
          {
            image: Array.from(uint8Array),
            prompt: `This is a Vietnamese receipt/bill. Extract purchased items with their UNIT PRICE (ĐG) and QUANTITY (SL).

Return ONLY JSON in this format:
{"items":[{"description":"item name","amount":"15.000","qty":2}],"merchant":"store name","total":"150.000"}

Rules:
- Extract each line item with: description, unit price (ĐG), quantity (SL)
- amount = unit price (ĐG), NOT line total
- qty = quantity (SL or Số Lượng), default 1 if not shown
- Skip subtotals, tax, service fee, tips
- Keep price format as string (e.g. "15.000")
- JSON only, no other text`,
            max_tokens: 1024,
          }
        );

        console.log('AI response:', JSON.stringify(response));

        // Parse the AI response - LLaVA returns { description: string }
        const aiText = response && typeof response === 'object'
          ? ('description' in response ? (response as { description: string }).description
            : 'response' in response ? (response as { response: string }).response : '')
          : '';
        console.log('AI text:', aiText);

        if (aiText) {
          try {
            // Try to extract JSON from the response
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);

              // Parse items array
              const items: ReceiptItem[] = [];
              if (Array.isArray(parsed.items)) {
                for (const item of parsed.items) {
                  let amount: number;
                  if (typeof item.amount === 'number') {
                    amount = item.amount;
                  } else if (typeof item.amount === 'string') {
                    // Handle Vietnamese format: . as thousands, , as decimal
                    // e.g., "15.000" = 15000, "15,50" = 15.5, "15.000,50" = 15000.5
                    let normalized = item.amount
                      .replace(/\./g, '')  // Remove . (thousands separator)
                      .replace(',', '.');   // Convert , to . (decimal separator)
                    amount = parseFloat(normalized);
                  } else {
                    amount = NaN;
                  }

                  // Convert to K (divide by 1000) if >= 1000
                  if (!isNaN(amount) && amount >= 1000) {
                    amount = amount / 1000;
                  }

                  // Get quantity (default 1)
                  let qty = 1;
                  if (typeof item.qty === 'number' && item.qty > 0) {
                    qty = Math.floor(item.qty);
                  } else if (typeof item.qty === 'string') {
                    const parsedQty = parseInt(item.qty, 10);
                    if (!isNaN(parsedQty) && parsedQty > 0) {
                      qty = parsedQty;
                    }
                  }

                  // Create multiple items based on quantity
                  if (!isNaN(amount) && amount > 0) {
                    const description = typeof item.description === 'string'
                      ? item.description.slice(0, 40)
                      : 'Item';
                    const finalAmount = Math.round(amount * 100) / 100;

                    for (let i = 0; i < qty; i++) {
                      items.push({
                        id: crypto.randomUUID(),
                        description,
                        amount: finalAmount,
                      });
                    }
                  }
                }
              }

              // Parse total with same Vietnamese format handling
              let total: number | undefined;
              if (typeof parsed.total === 'number') {
                total = parsed.total >= 1000 ? parsed.total / 1000 : parsed.total;
              } else if (typeof parsed.total === 'string') {
                let normalized = parsed.total
                  .replace(/\./g, '')
                  .replace(',', '.');
                total = parseFloat(normalized);
                if (!isNaN(total) && total >= 1000) {
                  total = total / 1000;
                }
              }

              extracted = {
                items,
                date: typeof parsed.date === 'string' ? parsed.date : undefined,
                merchant: typeof parsed.merchant === 'string' ? parsed.merchant : undefined,
                total: total && !isNaN(total) ? Math.round(total * 100) / 100 : undefined,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
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
    }

    return Response.json({
      success: true,
      data: {
        extracted,
      },
    });
  } catch (error) {
    console.error('Receipt processing error:', error);
    return Response.json(
      { success: false, error: 'Failed to process receipt' },
      { status: 500 }
    );
  }
};
