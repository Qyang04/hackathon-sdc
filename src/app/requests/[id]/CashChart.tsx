// Weekly lowest cash, without vs with the job, against the safety buffer. Plain SVG, no chart library.
// Drawn for the navy banner: the buffer is a "waterline" and the area under it is shaded.
// Hover: each week has a full-height hit area with a native tooltip giving both values.
import type { WeeklyPoint } from "@/lib/engine/types";
import { formatRM } from "@/lib/engine/money";
import { prettyDate, shortRM } from "../../format";

const W = 760;
const H = 230;
const PAD = { top: 22, right: 80, bottom: 26, left: 86 };

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
  const bottom = H - PAD.bottom;

  // Lowest week with the job: marked with a dot and its value
  const lowIdx = withJob.reduce((best, p, i) => (p.lowestDailySen < withJob[best].lowestDailySen ? i : best), 0);
  const low = withJob[lowIdx];
  const lowBelow = low.lowestDailySen < reserveSen;
  // Label below the dot (the line usually comes down into the low point from above); above it when near the axis
  const lowLabelY = y(low.lowestDailySen) + 22 <= bottom - 4 ? y(low.lowestDailySen) + 22 : y(low.lowestDailySen) - 12;
  const lowAnchor = lowIdx === 0 ? "start" : lowIdx === last ? "end" : "middle";

  // End labels: keep at least 13px apart so "With job" / "Without" / "Buffer" never overlap
  const ends = [
    { text: "With job", sen: withJob[last].lowestDailySen, fill: "#fff" },
    { text: "Without", sen: baseline[last].lowestDailySen, fill: "var(--on-navy-muted)" },
    { text: "Buffer", sen: reserveSen, fill: "var(--accent-light)" },
  ]
    .map((l) => ({ ...l, y: y(l.sen) + 4 }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 13);

  return (
    <figure style={{ margin: 0 }}>
      <div className="chart-legend">
        <span><i style={{ borderColor: "#fff" }} />With this job</span>
        <span><i style={{ borderColor: "var(--chart-baseline)" }} />Without this job</span>
        <span><i style={{ borderColor: "var(--accent-light)", borderTopStyle: "dashed" }} />Your safety buffer</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Lowest cash each week, with and without this job, against the safety buffer">
        <rect x={PAD.left} y={y(reserveSen)} width={W - PAD.left - PAD.right} height={Math.max(0, bottom - y(reserveSen))} fill="var(--water)" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--on-navy-muted)">{shortRM(t)}</text>
          </g>
        ))}
        {weeks.map((w, i) =>
          i % 2 === 0 ? (
            <text key={w} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--on-navy-muted)">{prettyDate(w, false)}</text>
          ) : null,
        )}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(reserveSen)} y2={y(reserveSen)} stroke="var(--accent-light)" strokeWidth={1.5} strokeDasharray="6 4" />
        <path d={path(baseline)} fill="none" stroke="var(--chart-baseline)" strokeWidth={2} strokeLinejoin="round" pathLength={1} className="draw-in" />
        <path d={path(withJob)} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" pathLength={1} className="draw-in" />
        <circle cx={x(lowIdx)} cy={y(low.lowestDailySen)} r={5} fill={lowBelow ? "var(--danger-light)" : "var(--accent-light)"} stroke="var(--navy-deep)" strokeWidth={2} />
        <text x={x(lowIdx)} y={lowLabelY} textAnchor={lowAnchor} fontSize={11} fontWeight={600} fill={lowBelow ? "var(--danger-light)" : "var(--accent-light)"}>
          {`lowest ${shortRM(low.lowestDailySen)}`}
        </text>
        {ends.map((l) => (
          <text key={l.text} x={x(last) + 8} y={l.y} fontSize={11} fill={l.fill}>{l.text}</text>
        ))}
        {weeks.map((w, i) => (
          <rect key={w} x={x(i) - step / 2} y={PAD.top} width={step} height={bottom - PAD.top} fill="transparent">
            <title>{`Week of ${prettyDate(w)}\nWith job: ${formatRM(withJob[i].lowestDailySen)}\nWithout: ${formatRM(baseline[i]?.lowestDailySen ?? 0)}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="small" style={{ color: "var(--on-navy-muted)" }}>Lowest balance in each week (weeks start Monday). Hover a week for the figures.</figcaption>
    </figure>
  );
}
