/** Small hand-drawn line icons (no icon library). */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const RoomIcon = () => (
  <svg {...base}>
    <rect x="4" y="3.5" width="16" height="12" rx="1.5" />
    <path d="M12 3.5v12M4 9.5h16" />
    <path d="M2.5 18.5h19M6 18.5v2M18 18.5v2" />
  </svg>
);

export const GardenIcon = () => (
  <svg {...base}>
    <path d="M3 20.5V10l9-6.5 9 6.5v10.5" />
    <path d="M3 20.5h18M12 3.5v17M7.5 6.7v13.8M16.5 6.7v13.8" />
  </svg>
);

export const SettingsIcon = () => (
  <svg {...base}>
    <path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1" />
    <circle cx="15" cy="6.5" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="17.5" r="2" />
  </svg>
);

export const BackIcon = () => (
  <svg {...base} width={20} height={20}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...base} width={20} height={20}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = () => (
  <svg {...base} width={20} height={20}>
    <path d="M5 12h14" />
  </svg>
);
