import { z } from 'zod';

/** المستويات حسب فلسفة المشروع (Persona-Based Learning) */
export const LEVELS = ['child', 'student', 'expert'] as const;
export type Level = (typeof LEVELS)[number];

/**
 * ملاحظة: OpenAI Structured Outputs (الوضع الصارم) يتطلب أن تكون كل الحقول
 * مطلوبة، فلا نستخدم .optional() — نستخدم .nullable() بدلاً منها.
 * كما لا يدعم قيود عدد العناصر (min/max للمصفوفات)، فنوجّه العدد عبر الوصف فقط.
 */

/** عقدة في المخطط — النص عربي ويُرسم برمجياً (لا صورة) */
export const diagramNodeSchema = z.object({
  id: z.string().describe('معرّف فريد قصير، مثل n1'),
  label: z.string().describe('نص العقدة بالعربية (٢–٥ كلمات)'),
});

/** حافة (سهم) بين عقدتين */
export const diagramEdgeSchema = z.object({
  from: z.string().describe('id العقدة المصدر'),
  to: z.string().describe('id العقدة الهدف'),
  label: z.string().nullable().describe('نص قصير على السهم بالعربية، أو null'),
});

export const diagramSchema = z.object({
  title: z.string().describe('عنوان المخطط بالعربية'),
  direction: z
    .enum(['TB', 'RL'])
    .describe('اتجاه التدفق: TB من أعلى لأسفل، RL من اليمين لليسار'),
  nodes: z.array(diagramNodeSchema).describe('من ٢ إلى ٨ عقد'),
  edges: z.array(diagramEdgeSchema).describe('روابط بين العقد بترتيب منطقي'),
});
export type Diagram = z.infer<typeof diagramSchema>;

export const stepSchema = z.object({
  order: z.number().int().describe('ترتيب الخطوة، يبدأ من ١'),
  title: z.string().describe('عنوان قصير للخطوة'),
  detail: z.string().describe('شرح الخطوة'),
  visual: z
    .string()
    .describe(
      'English description of a CLOSE-UP scene that isolates ONLY the specific part/region active in THIS step, showing the change/motion happening right now. Must DIFFER clearly from other steps: name the exact component in focus, dim or omit unrelated parts, and use words like "close-up of", "cutaway showing", "zoom into", "cross-section of". Do NOT describe the whole object again. No text in the image.',
    ),
});

export const explanationSchema = z.object({
  topic: z.string().describe('الموضوع كما فُهم، بصيغة موجزة'),
  level: z.enum(LEVELS),
  summary: z.string().describe('ملخّص من جملة أو جملتين'),
  subject: z
    .string()
    .describe(
      'وصف إنجليزي موجز للكائن/الجهاز الرئيسي + النمط الفني، ليبقى الشكل ثابتاً في كل الصور، بدون نص. مثال: "a white single-aisle commercial passenger jet, clean 3D educational illustration"',
    ),
  steps: z.array(stepSchema).describe('من ٣ إلى ٧ خطوات مرتبة منطقياً'),
  diagram: diagramSchema,
  relatedQuestions: z
    .array(z.string())
    .describe('من ٢ إلى ٤ أسئلة عربية متعلقة تبدأ بـ"كيف" أو "لماذا"'),
  imagePrompt: z
    .string()
    .describe(
      'وصف إنجليزي دقيق لمشهد توضيحي/مقطع هندسي لمولّد الصور — بدون أي نص في الصورة',
    ),
});
export type Explanation = z.infer<typeof explanationSchema>;
