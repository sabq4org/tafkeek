'use client';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

export function SearchBox({ value, onChange, onSubmit, loading }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="اسأل: كيف تعمل الطائرة؟"
        className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      <button
        type="submit"
        disabled={loading || value.trim().length < 2}
        className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? '...' : 'فكّك'}
      </button>
    </form>
  );
}
