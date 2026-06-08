import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { generateIllustration } from '@/lib/ai/image';

// صورة مرجعية + صورة لكل مرحلة — قد يأخذ دقيقة.
export const maxDuration = 300;

const bodySchema = z.object({
  subject: z.string().min(4).max(500),
  steps: z
    .array(
      z.object({
        order: z.number().int(),
        visual: z.string().min(4),
        detail: z.string().optional(),
      }),
    )
    .min(1)
    .max(8),
});

/** تنفيذ متوازٍ بحد أقصى للتزامن (لتجنّب تجاوز حدود المعدل). */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'مدخلات غير صالحة' }, { status: 400 });
  }

  const { subject, steps } = parsed.data;

  // 1) صورة مرجعية واحدة للكائن — تضمن ثبات الشكل عبر كل المراحل.
  let cover: string | null = null;
  try {
    cover = await generateIllustration(
      `${subject}. A clear, complete hero view of the whole subject, perfectly centered, showing its overall form and main components. This image defines the visual identity (style, colors, materials) for all following stage images.`,
    );
  } catch (err) {
    console.error('[illustrate] cover failed:', err);
  }

  // 2) صورة لكل مرحلة، مشروطة بالصورة المرجعية للحفاظ على نفس الشكل.
  const images = await mapWithConcurrency(steps, 3, async (step) => {
    try {
      const image = await generateIllustration(
        step.visual,
        cover ?? undefined,
        step.detail,
      );
      return { order: step.order, image };
    } catch (err) {
      console.error('[illustrate] step failed:', step.order, err);
      return { order: step.order, image: null as string | null };
    }
  });

  return Response.json({ cover, images });
}
