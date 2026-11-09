/** Decorative room illustrations (hand-authored SVG, no leaf-like shapes). */

export function WindowArt() {
  return (
    <div className="window-art" aria-hidden>
      <div className="window-art__curtain window-art__curtain--left" />
      <div className="window-art__frame">
        <div className="window-art__glass">
          <div className="window-art__sun" />
          <div className="window-art__hill window-art__hill--far" />
          <div className="window-art__hill window-art__hill--near" />
        </div>
        <div className="window-art__bar window-art__bar--v" />
        <div className="window-art__bar window-art__bar--h" />
      </div>
      <div className="window-art__curtain window-art__curtain--right" />
    </div>
  );
}

export function WateringCan() {
  return (
    <svg className="watering-can" viewBox="0 0 120 80" aria-hidden>
      <ellipse cx="58" cy="76" rx="40" ry="3.5" fill="rgba(70,50,30,0.12)" />
      <path d="M30 34 Q30 28 36 28 L74 28 Q80 28 80 34 L82 70 Q82 75 77 75 L35 75 Q30 75 30 70 Z" fill="#a9bba0" />
      <path d="M68 28 L74 28 Q80 28 80 34 L82 70 Q82 75 77 75 L70 75 Q75 60 68 28 Z" fill="#8fa386" />
      <path d="M80 44 L106 22" stroke="#a9bba0" strokeWidth="6" strokeLinecap="round" />
      <rect x="101" y="14" width="13" height="9" rx="2.5" transform="rotate(-40 107 18)" fill="#8fa386" />
      <path d="M38 28 Q55 6 72 28" fill="none" stroke="#8fa386" strokeWidth="5" strokeLinecap="round" />
      <path d="M36 40 L36 64" stroke="#c4d2bd" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BookStack() {
  return (
    <svg className="book-stack" viewBox="0 0 70 40" aria-hidden>
      <rect x="4" y="26" width="58" height="11" rx="2" fill="#c9a37a" />
      <rect x="9" y="15" width="52" height="11" rx="2" fill="#9cae8c" />
      <rect x="6" y="5" width="48" height="10" rx="2" fill="#d8b7a6" />
      <path d="M8 31.5h50M13 20.5h44M10 10h40" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
    </svg>
  );
}
