/**
 * توليد رسم توضيحي عبر Google Gemini "نانو بنانا برو" (gemini-3-pro-image-preview).
 *
 * لضمان ثبات شكل الكائن عبر المراحل: نولّد صورة مرجعية واحدة للكائن، ثم نمرّرها
 * كمرجع (reference) لكل مرحلة فيُبقي النموذج نفس الشكل والنمط.
 * لا نسمح بأي نص في الصورة — النص العربي يُرسم برمجياً في المخطط (SVG).
 */

const MODEL = 'gemini-3-pro-image-preview';

/** النمط البصري الموحّد — هوية واحدة لكل الصور لضمان جودة واتساق عاليين. */
const STYLE_ANCHOR =
  'Premium 3D educational illustration in a clean isometric cutaway style, similar to high-end Apple/textbook explainer graphics. Crisp vector-like surfaces, gentle ambient occlusion, soft diffused studio lighting, shallow depth of field on the focal part, harmonious muted color palette with one clear accent color, smooth gradients, plain light neutral background.';

/** إرشادات سلبية صريحة — تمنع أخطاء الجودة الشائعة. */
const NEGATIVE_CUES =
  'Avoid: blurriness, distortion, deformed or missing parts, extra duplicated parts, cluttered busy composition, photorealistic uncanny or scary look, harsh shadows, watermark, frame or border.';

const NO_TEXT =
  'Absolutely NO text, NO letters, NO numbers, NO captions, NO labels anywhere in the image.';

const BASE_STYLE = `. ${STYLE_ANCHOR} Scientifically accurate and faithful to how the real thing actually works; the relevant part must be the clear focal point; easy to understand at a glance. ${NEGATIVE_CUES} ${NO_TEXT}`;

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
  /** سياق علمي مختصر للمرحلة (مثلاً الـ detail العربي) لتوجيه دقة الصورة. */
  context?: string,
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

  // حقن السياق العلمي للمرحلة ليفهم النموذج "العلم" لا الشكل فقط.
  if (context && context.trim()) {
    text += `\n\nScientific context of what is happening in this stage (depict it faithfully): ${context.trim()}`;
  }

  parts.push({ text: text + BASE_STYLE });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          // تأطير أفقي مناسب للرسوم التوضيحية وجودة أعلى.
          imageConfig: { aspectRatio: '4:3' },
        },
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
