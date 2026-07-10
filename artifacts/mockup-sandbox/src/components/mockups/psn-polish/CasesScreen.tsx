import React from "react";

const C = {
  bg: "#FAF9F5",
  surface: "#FFFFFF",
  text: "#1C1B18",
  textSec: "#6B6A63",
  textMuted: "#9A988F",
  border: "#EAE8E1",
  primary: "#0F6E56",
  amber: "#E8A33D",
  amberText: "#412402",
  verifiedBg: "#E1F5EE",
  deadlineBg: "#FAEEDA",
  deadlineText: "#854F0B",
};

const cardShadow =
  "0 1px 2px rgba(28,27,24,0.04), 0 2px 10px rgba(28,27,24,0.07), 0 0 0 1px rgba(28,27,24,0.05)";

const cases = [
  {
    title: "Johnson v. Equifax",
    type: "FCRA / Credit",
    preview:
      "I've saved your Dispute Letter to Artifacts. Enter the send date below to calculate the 30-day response deadline.",
    time: "2h ago",
    intakeComplete: true,
  },
  {
    title: "Traffic Citation — July 4",
    type: "Traffic",
    preview:
      "Based on what you've shared, you have three procedural options worth exploring before your August court date.",
    time: "Yesterday",
    intakeComplete: true,
  },
  {
    title: "Smith v. Capital One",
    type: "General Civil",
    preview: "What's the situation? What's happening?",
    time: "3d ago",
    intakeComplete: false,
  },
];

const typeBadgeColor: Record<string, { bg: string; text: string }> = {
  "FCRA / Credit": { bg: C.verifiedBg, text: C.primary },
  Traffic: { bg: "#FFF4E5", text: "#92500A" },
  "General Civil": { bg: "#F0F0F0", text: "#555" },
};

export function CasesScreen() {
  return (
    <div
      style={{
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        background: C.bg,
        minHeight: "100vh",
        maxWidth: 390,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card-press { transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease; cursor: pointer; }
        .card-press:active { transform: scale(0.985); opacity: 0.9; box-shadow: 0 0px 2px rgba(28,27,24,0.04) !important; }
        .pill-btn:active { transform: scale(0.97); opacity: 0.88; }
        .pill-btn { transition: transform 0.12s ease, opacity 0.12s ease; cursor: pointer; }
        .menu-row:active { background: rgba(28,27,24,0.03); }
        .menu-row { transition: background 0.1s ease; cursor: pointer; }
      `}</style>

      {/* Status bar */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 24,
          paddingTop: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill={C.text}>
            <rect x="0" y="4" width="3" height="8" rx="1" opacity="0.35" />
            <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" opacity="0.6" />
            <rect x="9" y="0.5" width="3" height="11.5" rx="1" />
            <rect x="13.5" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill={C.text}>
            <path d="M8 3C5.33 3 2.9 4.1 1.1 5.9L0 4.8C2.1 2.7 4.9 1.5 8 1.5s5.9 1.2 7.9 3.3L14.9 5.9C13.1 4.1 10.67 3 8 3z" opacity="0.4"/>
            <path d="M8 6c-1.78 0-3.39.72-4.55 1.88L2.3 6.73C3.77 5.25 5.78 4.5 8 4.5s4.23.75 5.7 2.23L12.55 7.88C11.39 6.72 9.78 6 8 6z" opacity="0.7"/>
            <circle cx="8" cy="10.5" r="1.5"/>
          </svg>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>87%</span>
            <div style={{ width: 28, height: 14, border: `1.5px solid ${C.text}`, borderRadius: 3, padding: 2, display: "flex", alignItems: "center" }}>
              <div style={{ width: "80%", height: "100%", background: C.text, borderRadius: 1.5 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ paddingInline: 20, paddingTop: 8, paddingBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.7, color: C.text, lineHeight: 1.1 }}>
          My Cases
        </h1>
        <div
          className="pill-btn"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: C.verifiedBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 0 1.5px ${C.primary}22`,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: C.primary, letterSpacing: 0.3 }}>JD</span>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ paddingInline: 20, paddingTop: 10, paddingBottom: 4 }}>
        <div
          style={{
            background: C.surface,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingInline: 13,
            height: 40,
            boxShadow: "0 0 0 1px rgba(28,27,24,0.07)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 15, color: C.textMuted, fontWeight: 400 }}>Search cases…</span>
        </div>
      </div>

      {/* Section label */}
      <div style={{ paddingInline: 20, paddingTop: 20, paddingBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
          Active · {cases.length}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.primary, cursor: "pointer" }}>Sort</span>
      </div>

      {/* Case cards */}
      <div style={{ paddingInline: 20, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {cases.map((c, i) => {
          const badge = typeBadgeColor[c.type] ?? { bg: "#EEE", text: "#555" };
          return (
            <div
              key={i}
              className="card-press"
              style={{
                background: C.surface,
                borderRadius: 16,
                padding: "16px 18px",
                boxShadow: cardShadow,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                position: "relative",
              }}
            >
              {/* Top row: title + time */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingRight: 18 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: C.text, flex: 1, marginRight: 8, letterSpacing: -0.2, lineHeight: 1.3 }}>
                  {c.title}
                </span>
                <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, marginTop: 2 }}>{c.time}</span>
              </div>
              {/* Badge row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: badge.text, background: badge.bg, paddingInline: 8, paddingBlock: 3, borderRadius: 6, letterSpacing: 0.1 }}>
                  {c.type}
                </span>
                {c.intakeComplete && (
                  <span style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 3 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Intake done
                  </span>
                )}
              </div>
              {/* Preview */}
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {c.preview}
              </p>
              {/* Chevron */}
              <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div style={{ paddingInline: 20, paddingTop: 16, paddingBottom: 32 }}>
        <div
          className="pill-btn"
          style={{
            background: C.amber,
            borderRadius: 14,
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: `0 2px 12px ${C.amber}55`,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.amberText} strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.amberText, letterSpacing: 0.1 }}>New Case</span>
        </div>
      </div>
    </div>
  );
}
