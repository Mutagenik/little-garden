import { memo, useMemo, type KeyboardEvent, type MouseEvent } from 'react';
import type { LeafStatus, PlantStyle, PotColor } from '../lib/types';
import { generatePlant, nearestLeaf, PLANT_HEIGHT, PLANT_WIDTH } from './generatePlant';
import { POT_GEOMETRY, POT_PALETTE, POT_TRANSFORM } from './pots';
import './Plant.css';

export interface PlantProps {
  leafCount: number;
  seed: number;
  style: PlantStyle;
  potColor: PotColor;
  /** Status per leaf (index = day − 1). Missing entries render white. */
  statuses?: LeafStatus[];
  /** Index of today's leaf, highlighted with a soft glow. */
  todayIndex?: number;
  /** Leaves at or after this index are in the future (rendered folded/soft). */
  futureFrom?: number;
  selectedIndex?: number | null;
  /** When given, leaves become buttons. */
  onLeafSelect?: (index: number) => void;
  leafLabel?: (index: number) => string;
  className?: string;
  title?: string;
  /** Trim the empty space above the foliage (used on shelves so short plants sit tight). */
  crop?: boolean;
  /** Dev gallery only: print day numbers at each leaf's touch centre. */
  showIndices?: boolean;
}

function PlantView({
  leafCount,
  seed,
  style,
  potColor,
  statuses,
  todayIndex,
  futureFrom,
  selectedIndex,
  onLeafSelect,
  leafLabel,
  className,
  title,
  crop,
  showIndices,
}: PlantProps) {
  const spec = useMemo(() => generatePlant(leafCount, seed, style), [leafCount, seed, style]);
  const viewTop = crop ? Math.max(0, Math.floor(spec.top - 6)) : 0;
  const pot = POT_GEOMETRY[spec.pot];
  const colors = POT_PALETTE[potColor];
  const interactive = Boolean(onLeafSelect);

  const handleBackgroundClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onLeafSelect) return;
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM?.();
    if (!ctm || !svg.createSVGPoint) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    const index = nearestLeaf(spec, { x: local.x, y: local.y });
    if (index !== null) onLeafSelect(index);
  };

  const onLeafKey = (e: KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLeafSelect?.(index);
    }
  };

  return (
    <svg
      className={`plant ${interactive ? 'plant--interactive' : ''} ${className ?? ''}`}
      viewBox={`0 ${viewTop} ${PLANT_WIDTH} ${PLANT_HEIGHT - viewTop}`}
      role={interactive ? 'group' : 'img'}
      aria-label={title}
      onClick={interactive ? handleBackgroundClick : undefined}
      data-plant-style={style}
    >
      <g transform={POT_TRANSFORM}>
        <ellipse className="plant__shadow" {...pot.shadow} />
        <path d={pot.body} fill={colors.base} />
        <path d={pot.shade} fill={colors.shade} opacity={0.55} />
        <path d={pot.highlight} fill={colors.light} opacity={0.8} />
        <rect {...pot.rim} fill={colors.base} />
        <rect x={pot.rim.x} y={pot.rim.y + pot.rim.h - 3} width={pot.rim.w} height={3} fill={colors.shade} opacity={0.5} />
        <rect x={pot.rim.x + 6} y={pot.rim.y + 3} width={pot.rim.w * 0.35} height={2.2} rx={1.1} fill={colors.light} opacity={0.9} />
        <ellipse className="plant__soil" {...pot.soil} />
      </g>

      <g className="plant__stems">
        {spec.stems.map((s, i) => (
          <path key={i} d={s.d} strokeWidth={s.width} />
        ))}
      </g>

      <g className="plant__leaves">
        {spec.drawOrder.map((index) => {
          const leaf = spec.leaves[index];
          const status = statuses?.[index] ?? 'white';
          const isToday = index === todayIndex;
          const isFuture = futureFrom !== undefined && index >= futureFrom;
          const cls = [
            'leaf',
            `leaf--${status}`,
            isToday ? 'leaf--today' : '',
            isFuture ? 'leaf--future' : '',
            selectedIndex === index ? 'leaf--selected' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <g
              key={index}
              className={cls}
              data-leaf-index={index}
              data-status={status}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? leafLabel?.(index) : undefined}
              onClick={
                interactive
                  ? (e) => {
                      e.stopPropagation();
                      onLeafSelect?.(index);
                    }
                  : undefined
              }
              onKeyDown={interactive ? (e) => onLeafKey(e, index) : undefined}
            >
              <path className="leaf__blade" d={leaf.d} />
              <path className="leaf__vein" d={leaf.vein} />
            </g>
          );
        })}
      </g>
      {showIndices && (
        <g className="plant__debug" aria-hidden>
          {spec.leaves.map((leaf) => (
            <g key={leaf.index}>
              <circle cx={leaf.hit.x} cy={leaf.hit.y} r={11} fill="none" stroke="#c0392b" strokeWidth={0.6} strokeDasharray="2 2" />
              <text x={leaf.hit.x} y={leaf.hit.y + 3} textAnchor="middle" fontSize={9} fill="#7a2418" fontWeight={700}>
                {leaf.index + 1}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

export const Plant = memo(PlantView);
