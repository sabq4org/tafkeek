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
    'القارئ طفل فضولي (٧–١٢ سنة). استخدم لغة بسيطة جداً وجملاً قصيرة وتشبيهات من الحياة اليومية. تجنّب المصطلحات المعقّدة، وإن اضطررت اشرحها بكلمة بسيطة.',
  student:
    'القارئ طالب في مرحلة دراسية. استخدم لغة مدرسية واضحة مع المصطلحات العلمية الأساسية، واشرح كل مصطلح عند وروده لأول مرة.',
  expert:
    'القارئ مختص. قدّم تفاصيل تقنية دقيقة (فيزيائية/كيميائية/ميكانيكية) واستخدم المصطلحات الصحيحة دون تبسيط مُخلّ.',
};

function systemPrompt(level: Level): string {
  return [
    'أنت "تفكيك"، محرّك تعليمي يشرح "كيف تعمل الأشياء" بالعربية بشكل بصري ومنظّم.',
    LEVEL_PERSONA[level],
    'القواعد:',
    '- اكتب كل المخرجات النصية بالعربية الفصحى الواضحة: الملخّص، الخطوات، نصوص المخطط، والأسئلة المتعلقة.',
    '- steps: من ٣ إلى ٧ خطوات مرتبة منطقياً، لكل خطوة عنوان قصير وتفصيل واضح.',
    '- لكل خطوة الحقل visual: وصف إنجليزي مختصر وملموس لمشهد يصوّر تلك الخطوة (المكوّنات وما الذي يحدث فيها)، بدون أي نص أو حروف في الصورة.',
    '- subject: وصف إنجليزي موجز للكائن الرئيسي مع النمط الفني، ليظهر بنفس الشكل تماماً في كل صور المراحل. واجعل كل visual يستخدم نفس هذا الكائن بالضبط.',
    '- diagram: مخطط تدفّق مبسّط. كل عقدة label قصير بالعربية (٢–٥ كلمات)، والحواف (edges) تربط العقد بترتيب منطقي عبر id، ويمكن أن تحمل نصاً قصيراً.',
    '- imagePrompt: وصف دقيق بالإنجليزية لمشهد توضيحي أو مقطع هندسي. مهم جداً: اطلب صراحةً ألا تحتوي الصورة على أي نص أو حروف أو أرقام (no text, no letters, no labels)، لأن مولّدات الصور تُفسد النص العربي.',
    '- relatedQuestions: من ٢ إلى ٤ أسئلة عربية تبدأ بـ"كيف" أو "لماذا".',
    '- التزم الدقة العلمية المناسبة للمستوى المطلوب.',
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
