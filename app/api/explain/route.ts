import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { generateExplanation } from '@/lib/ai/explain';
import { LEVELS } from '@/lib/ai/schema';
import { prisma } from '@/lib/db';

// المهلة القصوى لتوليد الشرح (Fluid Compute على Vercel يدعم حتى 300 ثانية).
export const maxDuration = 60;

const bodySchema = z.object({
  query: z.string().min(2).max(200),
  level: z.enum(LEVELS).default('student'),
});

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

  const { query, level } = parsed.data;

  try {
    const explanation = await generateExplanation(query, level);

    // حفظ البحث + الشرح + المخطط (أفضل جهد — لا يُفشل الطلب لو تعذّر الحفظ).
    try {
      await prisma.search.create({
        data: {
          rawQuery: query,
          normalizedQuery: query.trim().toLowerCase(),
          level,
          status: 'completed',
          explanation: {
            create: {
              topic: explanation.topic,
              level,
              summary: explanation.summary,
              steps: explanation.steps,
              relatedQuestions: explanation.relatedQuestions,
              imagePrompt: explanation.imagePrompt,
              model: level,
              diagram: {
                create: {
                  title: explanation.diagram.title,
                  direction: explanation.diagram.direction,
                  nodes: explanation.diagram.nodes,
                  edges: explanation.diagram.edges,
                },
              },
            },
          },
        },
      });
    } catch (dbErr) {
      console.error('[explain] persistence skipped:', dbErr);
    }

    return Response.json({ explanation });
  } catch (err) {
    console.error('[explain] generation failed:', err);
    return Response.json({ error: 'تعذّر توليد الشرح' }, { status: 500 });
  }
}
