'use client';

import { useCallback, useState } from 'react';
import { SearchBox } from '@/components/search-box';
import { LevelSwitcher } from '@/components/level-switcher';
import { ExplanationView } from '@/components/explanation-view';
import type { Explanation, Level } from '@/lib/ai/schema';

const EXAMPLES = [
  'كيف تعمل الطائرة؟',
  'كيف يعمل الرادار؟',
  'كيف تعمل البطارية؟',
  'كيف يعمل التكييف؟',
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Explanation | null>(null);

  const run = useCallback(async (topic: string, lvl: Level) => {
    const trimmed = topic.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, level: lvl }),
      });
      if (!res.ok) throw new Error('تعذّر توليد الشرح، حاول مرة أخرى.');
      const data = (await res.json()) as { explanation: Explanation };
      setResult(data.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSubmit = () => run(query, level);

  const onChangeLevel = (lvl: Level) => {
    setLevel(lvl);
    if (result || query.trim().length >= 2) run(query, lvl);
  };

  const onSelect = (q: string) => {
    setQuery(q);
    run(q, level);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">تفكيك</h1>
        <p className="mt-2 text-slate-500">
          كيف تعمل الأشياء؟ افهمها خطوة بخطوة بشرح بصري.
        </p>
      </header>

      <SearchBox value={query} onChange={setQuery} onSubmit={onSubmit} loading={loading} />
      <LevelSwitcher value={level} onChange={onChangeLevel} disabled={loading} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3" aria-busy>
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      )}

      {!loading && result && (
        <ExplanationView explanation={result} onSelectRelated={onSelect} />
      )}

      {!loading && !result && !error && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="mb-4 text-slate-500">جرّب أحد هذه الأسئلة:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSelect(q)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
