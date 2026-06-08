/**
 * توليد رسم توضيحي تعليمي.
 *
 * المحرّك الأساسي: OpenAI gpt-image-1 (أدقّ التزاماً بالوصف العلمي وأوضح للرسوم
 * التعليمية). عند توفّر صورة مرجعية نستخدم مسار التعديل (images/edits) لإبقاء
 * نفس النمط والألوان عبر المراحل.
 *
 * عند فشل OpenAI لأي سبب نرجع تلقائياً إلى Google Gemini كاحتياط.
 *
 * لا نسمح بأي نص في الصورة — النص العربي يُرسم برمجياً في المخطط (SVG).
 */

const OPENAI_MODEL = 'gpt-image-1';
const GEMINI_MODEL = 'gemini-3-pro-image-preview';

/** النمط البصري الموحّد — هوية واحدة لكل الصور لضمان جودة واتساق عاليين. */
const STYLE_ANCHOR =
  'Premium 3D educational illustration in a clean isometric cutaway style, similar to high-end Apple/textbook explainer graphics. Crisp vector-like surfaces, gentle ambient occlusion, soft diffused studio lighting, shallow depth of field on the focal part, harmonious muted color palette with one clear accent color, smooth gradients, plain light neutral background.';

/** إرشادات سلبية صريحة — تمنع أخطاء الجودة الشائعة. */
const NEGATIVE_CUES =
  'Avoid: blurriness, distortion, deformed or missing parts, extra duplicated parts, cluttered busy composition, abstract messy blobs, photorealistic uncanny or scary look, harsh shadows, watermark, frame or border.';

const NO_TEXT =
  'Absolutely NO text, NO letters, NO numbers, NO captions, NO labels anywhere in the image.';

const BASE_STYLE = `. ${STYLE_ANCHOR} Scientifically accurate and faithful to how the real thing actually works; the relevant part must be the clear focal point; clean and easy to understand at a glance like a polished textbook figure. ${NEGATIVE_CUES} ${NO_TEXT}`;

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function parseDataUrl(
  dataUrl: string,
): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/s);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

/** يبني النص النهائي للـ prompt مع تعليمات المرجع والسياق العلمي. */
function buildPrompt(
  prompt: string,
  hasReference: boolean,
  context?: string,
): string {
  let text = prompt;

  if (hasReference) {
    text =
      'Use the provided reference image ONLY for visual consistency: keep the same art style, color palette, lighting and material look. ' +
      'Do NOT simply redraw the whole subject. Instead, illustrate THIS SPECIFIC STAGE and focus tightly on the part it describes — zoom in, crop, or cutaway as needed so the change in this stage is the clear focal point, while unrelated parts may be dimmed, simplified, or out of frame. ' +
      'This stage: ' +
      prompt;
  }

  if (context && context.trim()) {
    text += `\n\nScientific context of what is happening in this stage (depict it faithfully): ${context.trim()}`;
  }

  return text + BASE_STYLE;
}

/* ----------------------------- OpenAI (أساسي) ----------------------------- */

async function generateWithOpenAI(
  fullPrompt: string,
  reference?: string,
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY غير مضبوط');

  // مع مرجع: مسار التعديل (multipart). بدون مرجع: مسار التوليد (JSON).
  if (reference) {
    const ref = parseDataUrl(reference);
    if (ref) {
      const bytes = Buffer.from(ref.data, 'base64');
      const form = new FormData();
      form.append('model', OPENAI_MODEL);
      form.append('prompt', fullPrompt);
      form.append('size', '1536x1024');
      form.append('quality', 'high');
      form.append(
        'image',
        new Blob([new Uint8Array(bytes)], { type: ref.mimeType }),
        'reference.png',
      );

      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`OpenAI edits ${res.status}: ${detail.slice(0, 200)}`);
      }
      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) throw new Error('OpenAI لم يُرجع صورة');
      return `data:image/png;base64,${b64}`;
    }
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      prompt: fullPrompt,
      size: '1536x1024',
      quality: 'high',
      n: 1,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI generations ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI لم يُرجع صورة');
  return `data:image/png;base64,${b64}`;
}

/* ---------------------------- Gemini (احتياط) ---------------------------- */

async function generateWithGemini(
  fullPrompt: string,
  reference?: string,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY غير مضبوط');

  const parts: GeminiPart[] = [];
  if (reference) {
    const ref = parseDataUrl(reference);
    if (ref) parts.push({ inlineData: ref });
  }
  parts.push({ text: fullPrompt });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
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
  if (!img?.inlineData) throw new Error('Gemini لم يُرجع صورة');

  return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
}

/* ------------------------------- الواجهة العامة ------------------------------- */

export async function generateIllustration(
  prompt: string,
  reference?: string,
  /** سياق علمي مختصر للمرحلة (مثلاً الـ detail العربي) لتوجيه دقة الصورة. */
  context?: string,
): Promise<string> {
  const fullPrompt = buildPrompt(prompt, Boolean(reference), context);

  // المحرّك الأساسي: OpenAI gpt-image-1 (أوضح للرسوم التعليمية).
  try {
    return await generateWithOpenAI(fullPrompt, reference);
  } catch (err) {
    console.error('[image] OpenAI failed, falling back to Gemini:', err);
  }

  // الاحتياط: Gemini.
  return await generateWithGemini(fullPrompt, reference);
}
