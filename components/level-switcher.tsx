'use client';

import type { Level } from '@/lib/ai/schema';

const LEVEL_OPTIONS = [
  { id: 'child', label: 'فضولي صغير', hint: 'بدون مصطلحات' },
  { id: 'student', label: 'متعلّم', hint: 'مدرسي' },
  { id: 'expert', label: 'مختص', hint: 'تقني عميق' },
] as const;

type Props = {
  value: Level;
  onChange: (level: Level) => void;
  disabled?: boolean;
};

export function LevelSwitcher({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LEVEL_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={`rounded-xl border px-3 py-2 text-center transition disabled:opacity-50 ${
              active
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="font-semibold">{option.label}</div>
            <div className="text-xs text-slate-400">{option.hint}</div>
          </button>
        );
      })}
    </div>
  );
}
