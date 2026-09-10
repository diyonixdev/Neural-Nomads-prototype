export interface ListingData {
  farmer_name: string | null;
  phone: string | null;
  product: string | null;
  quantity: number | null;
  unit: 'kg' | 'tonnes' | null;
  asking_price: number | null;
  price_unit: string | null;
  location: string | null;
  quality: string | null;
  intent: 'sell' | 'buy';
}

export interface ExtractionResult {
  success: boolean;
  data?: ListingData;
  source?: 'ai' | 'fallback';
  error?: string;
}

const EXTRACT_ENDPOINT = '/api/extract-listing';

export const extractListing = async (text: string): Promise<ExtractionResult> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, error: 'Text is required' };
  }

  try {
    const res = await fetch(EXTRACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    });
    if (!res.ok) {
      return { success: false, error: `Extraction failed: ${res.status}` };
    }
    const payload = (await res.json()) as ExtractionResult;
    return payload;
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error' };
  }
};
