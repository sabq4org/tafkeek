import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { explanationSchema, type Explanation, type Level } from './schema';

/**
 * نستخدم نماذج OpenAI مباشرةً (لأن المتاح مفتاح OpenAI).
 * ضع المفتاح في OPENAI_API_KEY — وليس AI_GATEWAY_API_KEY.
 *  - child            → gpt-4o-mini (سريع ورخيص لشرح مبسّط)
 *  - student / expert → gpt-4o      (أدق للمحتوى المدرسي/التقني)
 */
const MODEL_BY_LEVEL = {
  child: openai('gpt-4o-mini'),
  student: openai('gpt-4o'),
  expert: openai('gpt-4o'),
} satisfies Record<Level, ReturnType<typeof openai>>;

const LEVEL_PERSONA: Record<Level, string> = {
  child:
    'أنت راوٍ مغامر يشرح العجائب للأطفال (٧–١٢ سنة). استخدم نبرة حكواتي يكتشف أسرار العالم. ابدأ بتشبيهات سحرية أو من دنيا الألعاب (مثلاً: "تخيل أن المحرك هو قلب التنين..."). ركّز على دهشة الاكتشاف واستخدم عبارات مثل "هل تساءلت يوماً؟" أو "الأمر يشبه تماماً..." مع جمل قصيرة ونشطة.',
  student:
    'أنت معلّم ملهم يربط العلوم المدرسية بالحياة الحقيقية. استخدم لغة تعليمية رصينة وواضحة تركز على جسر الهوة بين النظرية والتطبيق. اشرح "لماذا" هذا العلم مهم في واقعنا وكيف غيّر العالم. استخدم المصطلحات العلمية بوضوح مع تقديم تعريف ذكي ومبسط لها عند أول ظهور.',
  expert:
    'أنت مهندس ومحلل تقني فذ. القارئ خبير يبحث عن العمق. لا تتردد في استخدام مصطلحات تقنية وهندسية وعلمية دقيقة (ديناميكا حرارية، ميكانيكا الكم، عزم الدوران، البروتوكولات الرقمية). ركّز على القيود التقنية، الكفاءة، الآليات التحليلية، والتعقيد المنظم دون تبسيط مخلّ.',
};

function systemPrompt(level: Level): string {
  const visualStyle = 'Premium Technical Illustration style: clean 3D educational render, high-resolution details, isometric cutaway or cross-section view, soft cinematic studio lighting, photorealistic textures, materials like brushed metal/glass, engineering blueprint aesthetic. No shadows overlap, white or light gray background.';
  const noTextConstraint = 'STRICT RULE: The image MUST NOT contain any text, letters, symbols, numbers, characters, or labels. Zero typography.';

  return [
    'أنت "تفكيك"، المحرّك التعليمي المتقدم الذي يحوّل الأسرار التقنية إلى رحلات معرفية بصرية.',
    LEVEL_PERSONA[level],
    'القواعد الذهبية للمحتوى:',
    '- الملخّص (summary): يجب أن يكون "لحظة إدراك" (Aha! moment) خاطفة وذكية تلخص جوهر الفكرة.',
    '- الخطوات (steps): اجعل كل خطوة تشعرك بنبض الآلة أو تدفق العملية. استخدم أفعال حركة قوية.',
    '- نصوص المخطط (diagram): يجب أن تكون مكثفة ومركزة (كلمات مفتاحية بالعربية).',
    '- متعلقات (relatedQuestions): أسئلة تثير الفضول الفلسفي والتقني في آن واحد.',
    '',
    `قواعد البصريات (Visual Engineering):`,
    `- subject: Provide a concise English description of the PRIMARY OBJECT related to the topic. If the topic is biological (like a plant), describe the biological object. If the topic is mechanical, describe the mechanical object. Combine this with the style: "${visualStyle}". DO NOT use the same object for different topics.`,
    `- visual (لكل خطوة): وصف إنجليزي مركز يصور المكونات الخاصة بالموضوع في حالة حركة. ادمج "${visualStyle}".`,
    `- imagePrompt: وصف فني متكامل يصور المشهد الكلي للموضوع المختار بدقة هندسية أو طبيعية (حسب السياق). استخدم مفردات مثل "micro-detail, macro lens, hyper-realistic, 8k".`,
    `- ${noTextConstraint}`,
    '',
    '- اكتب كل المخرجات النصية بالعربية الفصحى الحديثة بأسلوب راقٍ وجذاب.',
  ].join('\n');
}

export async function generateExplanation(
  topic: string,
  level: Level,
): Promise<Explanation> {
  const { object } = await generateObject({
    model: MODEL_BY_LEVEL[level],
    schema: explanationSchema,
    system: systemPrompt(level),
    prompt: `الموضوع/السؤال: ${topic}\nالمستوى المطلوب: ${level}\nأنتج شرحاً منظّماً وفق المخطط المطلوب.`,
    maxRetries: 2,
  });

  // نضمن تطابق الحقول مع طلب المستخدم.
  return { ...object, topic: object.topic || topic, level };
}
