/**
 * توليد رسم توضيحي عبر Google Gemini "نانو بنانا برو" (gemini-3-pro-image-preview).
 *
 * لضمان ثبات شكل الكائن عبر المراحل: نولّد صورة مرجعية واحدة للكائن، ثم نمرّرها
 * كمرجع (reference) لكل مرحلة فيُبقي النموذج نفس الشكل والنمط.
 * لا نسمح بأي نص في الصورة — النص العربي يُرسم برمجياً في المخطط (SVG).
 */

const MODEL = 'gemini-3-pro-image-preview';

const BASE_STYLE =
  '. Clean, detailed technical educational illustration; soft colors; plain light background; scientifically accurate and faithful to how the real thing actually works; the relevant part must be the clear focal point; easy to understand at a glance. Absolutely NO text, NO letters, NO numbers, NO captions, NO labels anywhere in the image.';

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function parseDataUrl(
  dataUrl: string,
): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/s);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

export async function generateIllustration(
  prompt: string,
  reference?: string,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY غير مضبوط');

  const parts: GeminiPart[] = [];
  let text = prompt;

  if (reference) {
    const ref = parseDataUrl(reference);
    if (ref) {
      parts.push({ inlineData: ref });
      text =
        'Use the provided reference image ONLY for visual consistency: keep the same art style, color palette, lighting and material look. ' +
        'Do NOT simply redraw the whole subject. Instead, illustrate THIS SPECIFIC STAGE and focus tightly on the part it describes — zoom in, crop, or cutaway as needed so the change in this stage is the clear focal point, while unrelated parts may be dimmed, simplified, or out of frame. ' +
        'This stage: ' +
        prompt;
    }
  }
  parts.push({ text: text + BASE_STYLE });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const out: { inlineData?: { mimeType: string; data: string } }[] =
    json?.candidates?.[0]?.content?.parts ?? [];
  const img = out.find((p) => p.inlineData);
  if (!img?.inlineData) throw new Error('لم يُرجع النموذج صورة');

  return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
}
