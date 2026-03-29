/** Built-in templates for the custom view editor Examples menu. */

export type CustomViewExample = { id: string; label: string; code: string };

const HABIT_HEATMAP = `export default function HabitHeatmap({ rows, fields }) {
  const dateField = fields.find(f => f.slug === 'date' && f.type === 'date');
  if (!dateField) return <div className="p-4 text-gray-500">Add a 'date' field to use this view.</div>;

  const today = new Date();
  const weeks = 26;
  const days = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (weeks * 7 - 1 - i));
    return d;
  });

  const normalize = (v) => {
    if (v == null || v === '') return null;
    if (typeof v === 'string') return v.split('T')[0];
    return String(v).split('T')[0];
  };

  const dateSet = new Set(
    rows.map(r => normalize(r.data[dateField.slug])).filter(Boolean)
  );

  return (
    <div className="p-6">
      <h2 className="mb-4 text-sm font-medium text-gray-700">Activity — last 6 months</h2>
      <div className="flex gap-1">
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => {
              const day = days[w * 7 + d];
              const dateStr = day.toISOString().split('T')[0];
              const active = dateSet.has(dateStr);
              return (
                <div
                  key={d}
                  title={dateStr}
                  className={'h-3 w-3 rounded-sm ' + (active ? 'bg-indigo-500' : 'bg-gray-100')}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}`;

const EXPENSE_PIE = `export default function ExpenseChart({ rows, fields }) {
  const { PieChart, Pie, Cell, Tooltip, Legend } = Recharts;
  const amountField = fields.find(f => f.slug === 'amount');
  const categoryField = fields.find(f => f.type === 'select' && f.slug === 'category');
  if (!amountField || !categoryField)
    return <div className="p-4">Add &apos;amount&apos; and &apos;category&apos; fields.</div>;

  const totals = rows.reduce((acc, row) => {
    const cat = String(row.data[categoryField.slug] ?? 'Other');
    const amt = Number(row.data[amountField.slug] || 0);
    acc[cat] = (acc[cat] || 0) + amt;
    return acc;
  }, {});

  const data = Object.entries(totals).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="flex flex-col items-center p-4">
      <PieChart width={320} height={280}>
        <Pie data={data} cx={160} cy={120} outerRadius={100} dataKey="value" label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => String(v)} />
        <Legend />
      </PieChart>
    </div>
  );
}`;

const PROGRESS_DASHBOARD = `export default function ProgressDashboard({ rows, fields }) {
  const numberFields = fields.filter(f => f.type === 'number');
  if (!numberFields.length)
    return <div className="p-4 text-gray-500">Add number fields to see progress bars.</div>;

  const opts = (f) => {
    const o = f.options && f.options.max != null ? f.options : {};
    return { max: Number(o.max) || 100, unit: o.unit || '' };
  };

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="mb-3 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
            Row {row.id.slice(0, 8)}…
          </p>
          <div className="space-y-3">
            {numberFields.map((f) => {
              const { max, unit } = opts(f);
              const raw = Number(row.data[f.slug] ?? 0);
              const pct = Math.min(100, Math.max(0, (raw / max) * 100));
              return (
                <div key={f.id}>
                  <div className="mb-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{f.name}</span>
                    <span>
                      {raw}
                      {unit}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: pct + '%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}`;

const TIMELINE_VIEW = `export default function TimelineView({ rows, fields, onRowClick }) {
  const dateFields = fields.filter((f) => f.type === 'date' || f.type === 'datetime');
  if (!dateFields.length)
    return <div className="p-4 text-gray-500">Add a date or date &amp; time field for the timeline.</div>;

  const dateField = dateFields[0];
  const primary = fields.find((f) => f.is_primary);

  const parse = (v) => {
    if (v == null || v === '') return null;
    const t = Date.parse(String(v));
    return Number.isNaN(t) ? null : t;
  };

  const sorted = [...rows]
    .map((r) => ({ row: r, t: parse(r.data[dateField.slug]) }))
    .filter((x) => x.t != null)
    .sort((a, b) => b.t - a.t);

  return (
    <div className="p-6">
      <h2 className="mb-6 text-sm font-medium text-gray-700">Timeline ({dateField.name})</h2>
      <ul className="relative border-l border-gray-200 pl-6 dark:border-gray-700">
        {sorted.map(({ row, t }, i) => (
          <li key={row.id} className="mb-8 ml-1">
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-gray-900" />
            <button
              type="button"
              onClick={() => onRowClick(row.id)}
              className="block w-full text-left"
            >
              <time className="mb-1 text-xs text-gray-500">
                {new Date(t).toLocaleString()}
              </time>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {String(row.data[primary?.slug ?? ''] ?? 'Untitled')}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}`;

export const CUSTOM_VIEW_EXAMPLES: CustomViewExample[] = [
  { id: 'habit-heatmap', label: 'Habit Heatmap', code: HABIT_HEATMAP },
  { id: 'expense-pie', label: 'Expense Pie Chart', code: EXPENSE_PIE },
  { id: 'progress-dashboard', label: 'Progress Dashboard', code: PROGRESS_DASHBOARD },
  { id: 'timeline', label: 'Timeline View', code: TIMELINE_VIEW },
];
