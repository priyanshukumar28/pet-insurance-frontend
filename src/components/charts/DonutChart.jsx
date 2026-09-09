import { useState } from 'react';

// SVG donut built from stacked stroked circles. Hover a segment for a tooltip.
// Props:
//   segments: [{ label, value, color }]
//   centerLabel / centerSub: text shown in the middle
export default function DonutChart({ segments = [], centerLabel, centerSub, size = 200, thickness = 22 }) {
  const [hover, setHover] = useState(null); // segment label
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + (x.value || 0), 0);

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = total ? s.value / total : 0;
      const seg = { ...s, frac, dash: frac * c, gap: c - frac * c, off: -offset };
      offset += frac * c;
      return seg;
    });

  const hovered = arcs.find((a) => a.label === hover);

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      onMouseMove={(e) => setPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F3" strokeWidth={thickness} />
        {arcs.map((s) => (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === s.label ? thickness + 4 : thickness}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.off}
            strokeLinecap="butt"
            className="cursor-pointer transition-[stroke-width] duration-150"
            onMouseEnter={() => setHover(s.label)}
          />
        ))}
      </svg>

      <div className="absolute text-center">
        {centerLabel != null && (
          <div className="text-[26px] font-extrabold leading-none text-brand-ink">
            {hovered ? `${Math.round(hovered.frac * 1000) / 10}%` : centerLabel}
          </div>
        )}
        <div className="mt-1 text-[11px] font-medium text-brand-slate">
          {hovered ? hovered.label : centerSub}
        </div>
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-brand-line bg-white px-3 py-2 text-xs shadow-panel"
          style={
            pos.x > size / 2
              ? { right: size - pos.x + 12, top: pos.y + 12 }
              : { left: pos.x + 12, top: pos.y + 12 }
          }
        >
          <div className="flex items-center gap-1.5 font-semibold text-brand-ink">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: hovered.color }} />
            {hovered.label}
          </div>
          <div className="mt-0.5 text-brand-slate">
            {hovered.value} · {Math.round(hovered.frac * 1000) / 10}%
          </div>
        </div>
      )}
    </div>
  );
}
