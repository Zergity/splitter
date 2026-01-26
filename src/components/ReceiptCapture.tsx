import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { processReceipt, parseOCRText } from '../api/client';
import { ReceiptOCRResult } from '../types';

const MAX_IMAGE_DIMENSION = 1500;

interface ReceiptCaptureProps {
  onProcessed: (result: ReceiptOCRResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

// Resize image for better OCR
async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

export function ReceiptCapture({ onProcessed, onError, disabled }: ReceiptCaptureProps) {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Client-side OCR fallback using Tesseract.js
  const runClientOCR = async (file: File): Promise<ReceiptOCRResult> => {
    setStatus('Preparing image...');
    const imageData = await resizeImage(file);

    setStatus('Scanning receipt...');
    const result = await Tesseract.recognize(imageData, 'vie+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setStatus(`Scanning... ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const ocrText = result.data.text;
    console.log('OCR Text:', ocrText);

    // Send to AI for parsing
    setStatus('Analyzing with AI...');
    const parsed = await parseOCRText(ocrText);

    return {
      success: true,
      extracted: {
        ...parsed.extracted,
        confidence: result.data.confidence / 100,
      },
    };
  };

  const handleFile = async (file: File) => {
    setProcessing(true);

    try {
      // Try vision AI first
      setStatus('Processing with AI...');
      const result = await processReceipt(file);

      // If vision AI failed or returned no items, fallback to client OCR
      if (result.useClientOCR) {
        console.log('Vision AI returned no results, falling back to client OCR');
        const ocrResult = await runClientOCR(file);
        onProcessed(ocrResult);
      } else {
        onProcessed(result);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process receipt';
      onError?.(message);
    } finally {
      setProcessing(false);
      setStatus('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  };

  if (processing) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 rounded-lg">
        <svg className="animate-spin h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm text-gray-300">{status || 'Processing...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Take Photo
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Upload
        </button>
      </div>
    </div>
  );
}
