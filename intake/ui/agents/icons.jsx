const SVG_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.4,
  viewBox: "0 0 32 32",
  xmlns: "http://www.w3.org/2000/svg",
};

function PadariaMark() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M16 6v20" />
      <path d="M11 11c2.5 0 5 1.4 5 4" />
      <path d="M21 11c-2.5 0-5 1.4-5 4" />
      <path d="M9 17c3 0 6 1.6 7 4" />
      <path d="M23 17c-3 0-6 1.6-7 4" />
      <path d="M11 24h10" />
    </svg>
  );
}

function ClinicaMark() {
  return (
    <svg {...SVG_PROPS}>
      <circle cx="16" cy="16" r="11" />
      <path d="M16 11v10" />
      <path d="M11 16h10" />
    </svg>
  );
}

function SalaoMark() {
  return (
    <svg {...SVG_PROPS}>
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="9" cy="23" r="3.5" />
      <path d="M11.5 11.5l16 12" />
      <path d="M11.5 20.5l16-12" />
    </svg>
  );
}

function OficinaMark() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M22 6l4 4-3 3a4.2 4.2 0 01-5-5z" />
      <path d="M18 13L7 24" />
      <path d="M5 26l2 2" />
    </svg>
  );
}

function EcommerceMark() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M7 11h18l-1.6 14H8.6z" />
      <path d="M12 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

function AutomaticoMark() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M16 5l2.5 8.5L27 16l-8.5 2.5L16 27l-2.5-8.5L5 16l8.5-2.5z" />
    </svg>
  );
}

const ICONS = {
  padaria: PadariaMark,
  clinica: ClinicaMark,
  salao: SalaoMark,
  oficina: OficinaMark,
  ecommerce: EcommerceMark,
  auto: AutomaticoMark,
};

export default function AgentIcon({ id, className }) {
  const Component = ICONS[id];
  if (!Component) return null;
  return (
    <span aria-hidden="true" className={className}>
      <Component />
    </span>
  );
}
