import { memo, useId, useMemo, type KeyboardEvent, type MouseEvent } from 'react';
import type { LeafStatus, PlantStyle, PotColor } from '../lib/types';
import { generatePlant, nearestLeaf, PLANT_HEIGHT, PLANT_WIDTH } from './generatePlant';
import { POT_GEOMETRY, POT_PALETTE, POT_SHADOW, potSpecks, SOIL } from './pots';
import { leafColors, leafSkin, mixHex, STEM_COLOR, UNMARKED, type DecorTone, type LeafColors } from './skin';
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

const toneColor = (c: LeafColors, tone: DecorTone) => (tone === 'dark' ? c.dark : tone === 'band' ? c.band : c.vein);

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
  const skins = useMemo(() => spec.leaves.map((leaf) => leafSkin(spec, leaf)), [spec]);
  const specks = useMemo(() => potSpecks(seed), [seed]);
  // SVG ids must be unique per instance (several plants share a page).
  const uid = 'p' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const viewTop = crop ? Math.max(0, Math.floor(spec.top - 6)) : 0;
  const pot = POT_GEOMETRY[spec.pot];
  const potColors = POT_PALETTE[potColor];
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
      data-pot-color={potColor}
    >
      <defs>
        <clipPath id={`${uid}pot`}>
          <path d={pot.body} />
        </clipPath>
        <linearGradient id={`${uid}pg`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={mixHex(potColors.base, '#ffffff', 0.12)} />
          <stop offset="0.45" stopColor={potColors.base} />
          <stop offset="1" stopColor={potColors.shade} />
        </linearGradient>
      </defs>

      {/* Pot: matte, rimless, lightly speckled. */}
      <ellipse className="plant__shadow" {...POT_SHADOW} />
      <path d={pot.body} fill={`url(#${uid}pg)`} />
      <g clipPath={`url(#${uid}pot)`}>
        {specks.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={potColors.speck} opacity={s.opacity} />
        ))}
      </g>
      <ellipse className="plant__soil" cx={SOIL.cx} cy={SOIL.cy} rx={pot.soilRx} ry={SOIL.ry} />

      <g className="plant__stems" stroke={STEM_COLOR}>
        {spec.stems.map((s, i) => (
          <path key={i} d={s.d} strokeWidth={Math.round(s.width * 8) / 10} />
        ))}
      </g>

      <g className="plant__leaves">
        {spec.drawOrder.map((index) => {
          const leaf = spec.leaves[index];
          const skin = skins[index];
          const status = statuses?.[index] ?? 'white';
          const isToday = index === todayIndex;
          const isFuture = futureFrom !== undefined && index >= futureFrom;
          const marked = status !== 'white' && !isFuture;
          const colors = marked ? leafColors(style, status as Exclude<LeafStatus, 'white'>, skin.tone) : null;
          const clipId = `${uid}l${index}`;
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
              {colors ? (
                <>
                  <clipPath id={clipId}>
                    <path d={leaf.d} />
                  </clipPath>
                  <path className="leaf__blade" d={leaf.d} style={{ fill: colors.fill }} />
                  <g clipPath={`url(#${clipId})`} className="leaf__decor">
                    <path d={skin.half} style={{ fill: colors.light }} />
                    {skin.strokes.map((s, i) => (
                      <path
                        key={i}
                        d={s.d}
                        fill="none"
                        stroke={toneColor(colors, s.tone)}
                        strokeWidth={s.width}
                        strokeOpacity={s.opacity}
                        strokeLinecap="round"
                      />
                    ))}
                    {skin.dots.map((d, i) => (
                      <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={toneColor(colors, d.tone)} opacity={d.opacity} />
                    ))}
                    {skin.edge && <path d={leaf.d} fill="none" stroke={colors.edge} strokeWidth={1.8} />}
                  </g>
                  <path className="leaf__vein" d={leaf.vein} style={{ stroke: colors.vein }} />
                  <path className="leaf__outline" d={leaf.d} style={{ stroke: colors.dark, strokeOpacity: 0.35 }} />
                </>
              ) : (
                <>
                  <path
                    className="leaf__blade"
                    d={leaf.d}
                    style={{ fill: isFuture ? UNMARKED.future : UNMARKED.fill }}
                  />
                  <path className="leaf__vein" d={leaf.vein} style={{ stroke: UNMARKED.vein }} />
                  <path className="leaf__outline leaf__outline--plain" d={leaf.d} style={{ stroke: UNMARKED.line }} />
                </>
              )}
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
