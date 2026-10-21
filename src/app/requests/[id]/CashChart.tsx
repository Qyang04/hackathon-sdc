// Weekly lowest cash, without vs with the job, against the safety buffer. Plain SVG, no chart library.
// Hover: each week has a full-height hit area with a native tooltip giving both values.
import type { WeeklyPoint } from "@/lib/engine/types";
import { formatRM } from "@/lib/engine/money";

const W = 640;
const H = 220;
const PAD = { top: 16, right: 96, bottom: 28, left: 72 };

export function CashChart({ baseline, withJob, reserveSen }: { baseline: WeeklyPoint[]; withJob: WeeklyPoint[]; reserveSen: number }) {
  const weeks = withJob.map((w) => w.weekStart);
  if (weeks.length < 2) return null;
  const all = [...baseline, ...withJob].map((w) => w.lowestDailySen).concat(reserveSen, 0);
  const max = Math.max(...all);
  const min = Math.min(...all);
  const x = (i: number) => PAD.left + (i * (W - PAD.left - PAD.right)) / (weeks.length - 1);
  const y = (sen: number) => PAD.top + ((max - sen) * (H - PAD.top - PAD.bottom)) / (max - min || 1);
  const path = (pts: WeeklyPoint[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.lowestDailySen)}`).join(" ");
  const ticks = [max, (max + min) / 2, min].map((t) => Math.round(t / 100) * 100);
  const last = weeks.length - 1;
  const step = (W - PAD.left - PAD.right) / (weeks.length - 1);
  // End labels: keep at least 13px apart so "With job" / "Without" / "Buffer" never overlap
  const ends = [
    { text: "With job", sen: withJob[last].lowestDailySen, fill: "var(--text)" },
    { text: "Without", sen: baseline[last].lowestDailySen, fill: "var(--muted)" },
    { text: "Buffer", sen: reserveSen, fill: "var(--muted)" },
  ]
    .map((l) => ({ ...l, y: y(l.sen) + 4 }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 13);

  return (
    <figure style={{ margin: 0 }}>
      <div className="small muted" style={{ display: "flex", gap: 16, marginBottom: 6, flexWrap: "wrap" }}>
        <span><Swatch color="var(--accent)" /> With this job</span>
        <span><Swatch color="var(--chart-baseline)" /> Without this job</span>
        <span><Swatch color="var(--danger)" dashed /> Safety buffer</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Lowest cash each week, with and without this job, against the safety buffer">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{formatRM(t).replace(/\.\d\d$/, "")}</text>
          </g>
        ))}
        {weeks.map((w, i) =>
          i % 2 === 0 ? (
            <text key={w} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{w.slice(5)}</text>
          ) : null,
        )}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(reserveSen)} y2={y(reserveSen)} stroke="var(--danger)" strokeWidth={1.5} strokeDasharray="6 4" />
        <path d={path(baseline)} fill="none" stroke="var(--chart-baseline)" strokeWidth={2} strokeLinejoin="round" />
        <path d={path(withJob)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
        {ends.map((l) => (
          <text key={l.text} x={x(last) + 8} y={l.y} fontSize={11} fill={l.fill}>{l.text}</text>
        ))}
        {weeks.map((w, i) => (
          <g key={w}>
            <rect x={x(i) - step / 2} y={PAD.top} width={step} height={H - PAD.top - PAD.bottom} fill="transparent">
              <title>{`Week of ${w}\nWith job: ${formatRM(withJob[i].lowestDailySen)}\nWithout: ${formatRM(baseline[i]?.lowestDailySen ?? 0)}`}</title>
            </rect>
          </g>
        ))}
      </svg>
      <figcaption className="small muted">Lowest balance in each week (weeks start Monday). Hover a week for the figures.</figcaption>
    </figure>
  );
}

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ display: "inline-block", width: 16, height: 0, borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`, verticalAlign: "middle" }}
    />
  );
}
