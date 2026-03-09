export function StatusBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded bg-slate-200">
      <div className="h-2 rounded bg-brand-500" style={{ width: `${value}%` }} />
    </div>
  );
}
