import { useState } from 'react';
import { inr, compactInr, num } from '../../lib/format.js';

const COL_PROPOSALS = '#9DC1F4';
const COL_POLICIES = '#22C55E';
const COL_PREMIUM = '#8B5CF6';

function niceMax(v) {
  if (!v || v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Combo chart: grouped bars (proposals + policies, left "Count" axis) plus a
// premium line on a right axis. Pure SVG. Hover a column for an exact-value
// tooltip.
export default function TrendChart({ data = [], granularity = 'day' }) {
  const [hover, setHover] = useState(null);

  const H = 260;
  const padL = 40;
  const padR = 52;
  const padT = 14;
  const padB = 34;
  const stepW = granularity === 'day' ? 34 : 62;
  const W = Math.max(680, data.length * stepW + padL + padR);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const countMax = niceMax(Math.max(5, ...data.map((d) => Math.max(d.proposals, d.policies))) * 1.1);
  const premRaw = Math.max(0, ...data.map((d) => d.premium));
  const premMax = niceMax(Math.max(1000, premRaw * 1.15));

  const yCount = (v) => padT + plotH - (v / countMax) * plotH;
  const yPrem = (v) => padT + plotH - (v / premMax) * plotH;
  const bandW = plotW / Math.max(data.length, 1);
  const xCenter = (i) => padL + bandW * i + bandW / 2;

  const barW = Math.min(11, bandW * 0.3);
  const gap = 2;
  const labelEvery = data.length <= 16 ? 1 : Math.ceil(data.length / 12);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const linePts = data.map((d, i) => `${xCenter(i)},${yPrem(d.premium)}`).join(' ');
  const hd = hover != null ? data[hover] : null;

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ width: W }} onMouseLeave={() => setHover(null)}>
        <svg width={W} height={H} role="img" aria-label="Sales and proposals trend">
          {ticks.map((t) => {
            const y = padT + plotH - t * plotH;
            return (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#EEF0F3" />
                <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#98A2B3">
                  {Math.round(countMax * t)}
                </text>
                <text x={W - padR + 8} y={y + 4} textAnchor="start" fontSize="10" fill="#98A2B3">
                  {compactInr(premMax * t)}
                </text>
              </g>
            );
          })}

          {/* hovered column highlight + guide */}
          {hover != null && (
            <>
              <rect x={padL + bandW * hover} y={padT} width={bandW} height={plotH} fill="#1363DF" opacity="0.06" />
              <line x1={xCenter(hover)} x2={xCenter(hover)} y1={padT} y2={padT + plotH} stroke="#C9D6EA" strokeDasharray="3 3" />
            </>
          )}

          {/* bars */}
          {data.map((d, i) => {
            const cx = xCenter(i);
            return (
              <g key={d.date}>
                <rect x={cx - barW - gap / 2} y={yCount(d.proposals)} width={barW} height={Math.max(0, plotH + padT - yCount(d.proposals))} rx="2" fill={COL_PROPOSALS} />
                <rect x={cx + gap / 2} y={yCount(d.policies)} width={barW} height={Math.max(0, plotH + padT - yCount(d.policies))} rx="2" fill={COL_POLICIES} />
              </g>
            );
          })}

          {/* premium line */}
          {data.length > 1 && <polyline points={linePts} fill="none" stroke={COL_PREMIUM} strokeWidth="2" />}
          {data.map((d, i) => (
            <circle
              key={`p-${d.date}`}
              cx={xCenter(i)}
              cy={yPrem(d.premium)}
              r={hover === i ? 5 : 3}
              fill="#fff"
              stroke={COL_PREMIUM}
              strokeWidth="2"
            />
          ))}

          {/* x labels */}
          {data.map((d, i) =>
            i % labelEvery === 0 || hover === i ? (
              <text
                key={`x-${d.date}`}
                x={xCenter(i)}
                y={H - 12}
                textAnchor="middle"
                fontSize="10"
                fill={hover === i ? '#1363DF' : '#98A2B3'}
                fontWeight={hover === i ? 600 : 400}
              >
                {d.label}
              </text>
            ) : null
          )}

          {/* full-height hover hit targets */}
          {data.map((d, i) => (
            <rect
              key={`h-${d.date}`}
              x={padL + bandW * i}
              y={padT}
              width={bandW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {hd && (
          <div
            className="pointer-events-none absolute z-10 w-[168px] -translate-x-1/2 rounded-lg border border-brand-line bg-white px-3 py-2 text-xs shadow-panel"
            style={{ left: clamp(xCenter(hover), 88, W - 88), top: 4 }}
          >
            <div className="mb-1.5 font-semibold text-brand-ink">{hd.label}</div>
            <Row color={COL_PROPOSALS} label="Proposals" value={num(hd.proposals)} />
            <Row color={COL_POLICIES} label="Policies sold" value={num(hd.policies)} />
            <Row color={COL_PREMIUM} label="Premium" value={inr(hd.premium, { decimals: true })} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="inline-flex items-center gap-1.5 text-brand-slate">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-semibold text-brand-ink">{value}</span>
    </div>
  );
}
