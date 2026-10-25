const fmt = new Intl.NumberFormat('ru-RU');

interface Props {
  labels: string[];
  values: number[];
  /** вертикальные столбики — для временного ряда (дат много), иначе горизонтальные полосы */
  vertical?: boolean;
}

export function BarChart({ labels, values, vertical }: Props) {
  const max = Math.max(...values, 1);

  if (vertical) {
    return (
      <div>
        <div className="flex h-44 items-end gap-[2px]">
          {values.map((v, i) => (
            <div key={labels[i]} className="group relative flex h-full flex-1 items-end">
              <div className="w-full rounded-t-sm bg-indigo-500 transition-colors group-hover:bg-indigo-700" style={{ height: `${(v / max) * 100}%` }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                {labels[i]}: {fmt.format(v)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px] text-[10px] text-slate-500">
          {labels.map((l, i) => (
            <div key={l} className="flex-1 text-center">{i % 7 === 0 || i === labels.length - 1 ? l : ''}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={labels[i]} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-slate-600" title={labels[i]}>{labels[i]}</span>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-5 rounded bg-indigo-500" style={{ width: `${Math.max((v / max) * 85, 0.5)}%` }} />
            <span className="tabular-nums text-slate-700">{fmt.format(v)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
