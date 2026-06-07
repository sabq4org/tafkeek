'use client';

import { useEffect, useState } from 'react';
import type { Explanation } from '@/lib/ai/schema';
import { DiagramRenderer } from '@/components/diagram/DiagramRenderer';

type Props = {
  explanation: Explanation;
  onSelectRelated: (question: string) => void;
};

type ImgState = 'idle' | 'loading' | 'done' | 'error';

export function ExplanationView({ explanation, onSelectRelated }: Props) {
  const steps = [...explanation.steps].sort((a, b) => a.order - b.order);

  const [imgState, setImgState] = useState<ImgState>('idle');
  const [cover, setCover] = useState<string | null>(null);
  const [images, setImages] = useState<Record<number, string | null>>({});
  const [imgError, setImgError] = useState<string | null>(null);

  // تصفير الرسوم عند تغيّر الموضوع (بحث جديد)
  useEffect(() => {
    setImgState('idle');
    setCover(null);
    setImages({});
    setImgError(null);
  }, [explanation.topic]);

  const generateImages = async () => {
    setImgState('loading');
    setImgError(null);
    try {
      const res = await fetch('/api/illustrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: explanation.subject,
          steps: steps.map((s) => ({ order: s.order, visual: s.visual })),
        }),
      });
      if (!res.ok) throw new Error('تعذّر توليد الرسوم، حاول مرة أخرى.');
      const data = (await res.json()) as {
        cover: string | null;
        images: { order: number; image: string | null }[];
      };
      const map: Record<number, string | null> = {};
      for (const item of data.images) map[item.order] = item.image;
      setCover(data.cover);
      setImages(map);
      setImgState('done');
    } catch (e) {
      setImgError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
      setImgState('error');
    }
  };

  return (
    <article className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">{explanation.topic}</h2>
        <p className="mt-2 leading-relaxed text-slate-600">{explanation.summary}</p>
      </section>

      {/* المراحل: نص دقيق + رسم توضيحي لكل مرحلة */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800">المراحل</h3>
          {imgState === 'idle' && (
            <button
              type="button"
              onClick={generateImages}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              🎨 أضف رسوماً توضيحية للمراحل
            </button>
          )}
          {imgState === 'loading' && (
            <span className="animate-pulse text-sm text-slate-500">
              يرسم المراحل...
            </span>
          )}
          {(imgState === 'done' || imgState === 'error') && (
            <button
              type="button"
              onClick={generateImages}
              className="text-sm text-indigo-600 hover:underline"
            >
              إعادة التوليد
            </button>
          )}
        </div>

        {imgError && imgState === 'error' && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">
            {imgError}
          </p>
        )}

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt="الشكل العام"
            className="mb-5 w-full rounded-xl border border-slate-200"
          />
        )}

        <ol className="flex flex-col gap-6">
          {steps.map((step) => (
            <li key={step.order} className="flex flex-col gap-3">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {step.order}
                </span>
                <div>
                  <div className="font-semibold text-slate-800">{step.title}</div>
                  <div className="text-slate-600">{step.detail}</div>
                </div>
              </div>

              {/* الصورة أسفل النص */}
              {imgState === 'loading' && images[step.order] === undefined && (
                <div className="ms-10 flex h-56 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
                  <span className="animate-pulse">يُرسم...</span>
                </div>
              )}
              {images[step.order] && (
                // data URL — نستخدم <img> لأن next/image لا يناسب data URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[step.order] as string}
                  alt={`رسم توضيحي: ${step.title}`}
                  className="ms-10 w-full rounded-xl border border-slate-200"
                />
              )}
              {imgState === 'done' && images[step.order] === null && (
                <p className="ms-10 text-xs text-slate-400">
                  تعذّر رسم هذه المرحلة — جرّب «إعادة التوليد».
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-800">{explanation.diagram.title}</h3>
        <div className="overflow-x-auto">
          <DiagramRenderer diagram={explanation.diagram} />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          المخطط مرسوم برمجياً (SVG) لضمان دقة النص العربي بلا أخطاء.
        </p>
      </section>

      {explanation.relatedQuestions.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-slate-800">أسئلة متعلقة</h3>
          <div className="flex flex-wrap gap-2">
            {explanation.relatedQuestions.map((question, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectRelated(question)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                {question}
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
