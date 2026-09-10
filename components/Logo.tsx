"use client";

interface LogoProps {
  size?: number;
  tone?: "brand" | "light";
  withText?: boolean;
  textColor?: string;
  sublabel?: string;
}

export default function Logo({ size = 40, tone = "brand", withText = false, textColor = "#252525", sublabel }: LogoProps) {
  const badgeBg = tone === "brand" ? "#6F7F3B" : "#1A1E14";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <rect x="2" y="2" width="44" height="44" rx="13" fill={badgeBg} />
        <path d="M12 21.5 L24 12.5 L36 21.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="23" width="20" height="15" rx="2.5" fill="#D9A441" />
        <rect x="14" y="23" width="20" height="6" fill="#fff" opacity="0.92" />
        <circle cx="20" cy="29.5" r="1.5" fill="#6F7F3B" />
        <circle cx="24" cy="29.5" r="1.5" fill="#6F7F3B" />
        <circle cx="28" cy="29.5" r="1.5" fill="#6F7F3B" />
        <rect x="19.5" y="32" width="9" height="6" rx="1.5" fill="#fff" />
      </svg>
      {withText && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: size * 0.45, fontWeight: 700, color: textColor, letterSpacing: "-0.3px", lineHeight: 1.1 }}>
            RUVANA
          </span>
          {sublabel && (
            <span style={{ fontSize: size * 0.24, color: textColor, opacity: 0.65, letterSpacing: "0.4px", lineHeight: 1.2 }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}