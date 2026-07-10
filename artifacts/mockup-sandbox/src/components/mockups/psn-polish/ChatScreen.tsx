import React from "react";

const C = {
  bg: "#FAF9F5",
  surface: "#FFFFFF",
  text: "#1C1B18",
  textSec: "#6B6A63",
  textMuted: "#9A988F",
  border: "#EAE8E1",
  borderStrong: "#D8D5CC",
  primary: "#0F6E56",
  primaryLight: "#1D9E75",
  amber: "#E8A33D",
  amberText: "#412402",
  amberBg: "#FAEEDA",
  verifiedBg: "#E1F5EE",
  verifiedBorder: "#A7D9C8",
};

const elevatedCard =
  "0 1px 3px rgba(28,27,24,0.05), 0 3px 12px rgba(28,27,24,0.07), 0 0 0 1px rgba(28,27,24,0.05)";

const subtleCard =
  "0 1px 2px rgba(28,27,24,0.04), 0 0 0 1px rgba(28,27,24,0.05)";

/* ─── Navigator Avatar ─── */
function NavAvatar() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 1px 4px ${C.primary}44`,
      }}
    >
      {/* compass icon */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.8" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="white" />
      </svg>
    </div>
  );
}

/* ─── Navigator label row ─── */
function NavLabel({ time }: { time?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
      <NavAvatar />
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.primary,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Navigator
      </span>
      {time && (
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 2 }}>{time}</span>
      )}
    </div>
  );
}

/* ─── Next-step action card ─── */
function ActionCard({ steps }: { steps: { label: string; sub: string }[] }) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 14,
        boxShadow: elevatedCard,
        overflow: "hidden",
        borderLeft: `3px solid ${C.primary}`,
      }}
    >
      {steps.map((s, i) => (
        <div key={i}>
          <div
            className="step-row"
            style={{
              padding: "13px 14px 13px 14px",
              display: "flex",
              alignItems: "center",
              gap: 11,
              cursor: "pointer",
            }}
          >
            {/* step number */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: C.bg,
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.textMuted,
                  lineHeight: 1,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.text,
                  lineHeight: 1.3,
                  letterSpacing: -0.1,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.textMuted,
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {s.sub}
              </div>
            </div>

            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.primaryLight}
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                height: 1,
                background: C.border,
                marginLeft: 45,
                marginRight: 14,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── User message bubble ─── */
function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, letterSpacing: 0.2 }}>
        You
      </span>
      <div
        style={{
          background: C.verifiedBg,
          borderRadius: "18px 18px 4px 18px",
          paddingInline: 16,
          paddingBlock: 12,
          maxWidth: "82%",
          boxShadow: subtleCard,
          border: `1px solid ${C.verifiedBorder}`,
        }}
      >
        <p
          style={{
            fontSize: 15,
            color: C.text,
            lineHeight: 1.6,
            fontWeight: 500,
            margin: 0,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

/* ─── Message action row (copy, etc.) ─── */
function MsgActions() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", paddingLeft: 35 }}>
      {[
        {
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          ),
          label: "Copy",
        },
        {
          icon: (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.48" />
            </svg>
          ),
          label: "Regenerate",
        },
      ].map((a, i) => (
        <div
          key={i}
          className="msg-action"
          style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
        >
          {a.icon}
          <span style={{ fontSize: 12, color: C.textMuted }}>{a.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Date separator ─── */
function DateSep({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingBlock: 4,
      }}
    >
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.textMuted,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

/* ─── Main component ─── */
export function ChatScreen() {
  return (
    <div
      style={{
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        background: C.bg,
        height: "100vh",
        maxWidth: 390,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .step-row { transition: background 0.1s ease; }
        .step-row:active { background: rgba(15,110,86,0.05) !important; }
        .msg-action { opacity: 0.85; transition: opacity 0.1s; }
        .msg-action:hover { opacity: 1; }
        .icon-btn { border-radius: 50%; transition: background 0.1s ease; cursor: pointer; }
        .icon-btn:active { background: rgba(28,27,24,0.07) !important; }
        .send-active { transition: transform 0.1s ease, box-shadow 0.1s ease; cursor: pointer; }
        .send-active:active { transform: scale(0.88); }
        .seg-pill { cursor: pointer; transition: all 0.15s ease; }
      `}</style>

      {/* ── Status bar ── */}
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: 24,
          paddingTop: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill={C.text}>
            <rect x="0" y="4" width="3" height="8" rx="1" opacity="0.35" />
            <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" opacity="0.6" />
            <rect x="9" y="0.5" width="3" height="11.5" rx="1" />
            <rect x="13.5" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg width="15" height="11" viewBox="0 0 24 18" fill={C.text}>
            <path d="M12 3.5C7.86 3.5 4.14 5.3 1.5 8.2L0 6.5C3.07 3.07 7.3 1 12 1s8.93 2.07 12 5.5L22.5 8.2C19.86 5.3 16.14 3.5 12 3.5z" opacity="0.4"/>
            <path d="M12 7.5c-2.83 0-5.36 1.18-7.17 3.06L3.3 8.9C5.48 6.53 8.57 5 12 5s6.52 1.53 8.7 3.9l-1.53 1.66C17.36 8.68 14.83 7.5 12 7.5z" opacity="0.7"/>
            <circle cx="12" cy="15.5" r="2.5"/>
          </svg>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>87%</span>
            <div style={{ width: 26, height: 13, border: `1.5px solid ${C.text}`, borderRadius: 3, padding: "1.5px" }}>
              <div style={{ width: "80%", height: "100%", background: C.text, borderRadius: 1.5 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div
        style={{
          paddingInline: 14,
          paddingBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Back button */}
        <div
          className="icon-btn"
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            gap: 2,
            paddingLeft: 4,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round">
            <polyline points="8 1 1 8 8 15" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.primary }}>Cases</span>
        </div>

        {/* Title block */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>
              FCRA Dispute
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.primary,
                background: C.verifiedBg,
                paddingInline: 6,
                paddingBlock: 2,
                borderRadius: 5,
                letterSpacing: 0.3,
              }}
            >
              FCRA
            </span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
            Johnson v. Equifax
          </div>
        </div>

        {/* More button */}
        <div
          className="icon-btn"
          style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={C.textMuted}>
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </div>
      </div>

      {/* ── Segmented control ── */}
      <div style={{ paddingInline: 20, paddingBottom: 10, flexShrink: 0 }}>
        <div
          style={{
            background: "rgba(28,27,24,0.06)",
            borderRadius: 11,
            padding: 3,
            display: "flex",
            gap: 2,
          }}
        >
          <div
            className="seg-pill"
            style={{
              flex: 1,
              borderRadius: 9,
              background: C.surface,
              paddingBlock: 7,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
              boxShadow: "0 1px 4px rgba(28,27,24,0.1), 0 0 0 0.5px rgba(28,27,24,0.06)",
            }}
          >
            Chat
          </div>
          <div
            className="seg-pill"
            style={{
              flex: 1,
              borderRadius: 9,
              paddingBlock: 7,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              color: C.textMuted,
            }}
          >
            Artifacts · 2
          </div>
        </div>
      </div>

      {/* ── Progress indicator ── */}
      <div style={{ paddingInline: 20, marginBottom: 2, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Intake
          </span>
          <span style={{ fontSize: 11, color: C.textMuted }}>Step 2 of 5</span>
        </div>
        <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              width: "40%",
              height: "100%",
              background: `linear-gradient(90deg, ${C.primary}, ${C.primaryLight})`,
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      {/* ── Thin rule ── */}
      <div style={{ height: 1, background: C.border, marginTop: 10, flexShrink: 0 }} />

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px" }}>

        <DateSep label="Today" />

        {/* ─ Turn 1: Navigator ─ */}
        <div style={{ marginTop: 20 }}>
          <NavLabel time="9:38 AM" />
          <div style={{ paddingLeft: 35 }}>
            <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, fontWeight: 400 }}>
              Welcome. I'm your Navigator.
            </p>
            <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, marginTop: 10, fontWeight: 400 }}>
              I'll guide you step by step — no legal background required. Everything stays private to this case.
            </p>
            <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, marginTop: 10, fontWeight: 400 }}>
              First, tell me: what's the situation?
            </p>
          </div>

          {/* Action card */}
          <div style={{ paddingLeft: 35, marginTop: 14 }}>
            <ActionCard
              steps={[
                { label: "Someone is suing me", sub: "I was served papers or got a court notice" },
                { label: "I want to take someone to court", sub: "I have a dispute or I was wronged" },
                { label: "I received a court order", sub: "Something I need to respond to" },
              ]}
            />
          </div>

          {/* Msg actions */}
          <div style={{ marginTop: 10 }}>
            <MsgActions />
          </div>
        </div>

        {/* ─ Turn 2: User ─ */}
        <div style={{ marginTop: 28 }}>
          <UserBubble text="Someone is suing me for a debt I don't recognize" />
        </div>

        {/* ─ Turn 3: Navigator ─ */}
        <div style={{ marginTop: 28 }}>
          <NavLabel time="9:39 AM" />
          <div style={{ paddingLeft: 35 }}>
            <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, fontWeight: 400 }}>
              Got it. This is more common than most people realize — and you have real rights under federal law.
            </p>
            <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, marginTop: 10, fontWeight: 400 }}>
              Before we go further, let me understand who is on the other side of this.
            </p>
          </div>

          {/* Action card for turn 3 */}
          <div style={{ paddingLeft: 35, marginTop: 14 }}>
            <ActionCard
              steps={[
                { label: "A debt collector or law firm", sub: "They're trying to collect money on behalf of someone else" },
                { label: "The original creditor", sub: "e.g. the bank or lender directly" },
                { label: "Not sure", sub: "I don't recognize the name on the paperwork" },
              ]}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <MsgActions />
          </div>
        </div>

        {/* Typing indicator */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <NavAvatar />
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                background: C.surface,
                borderRadius: 12,
                paddingInline: 12,
                paddingBlock: 10,
                boxShadow: subtleCard,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: C.primaryLight,
                    opacity: 0.6 + i * 0.15,
                    animation: `bounce ${0.9}s ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: 12 }} />
      </div>

      {/* ── Input bar ── */}
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          paddingInline: 14,
          paddingTop: 11,
          paddingBottom: 30,
          background: C.bg,
          flexShrink: 0,
        }}
      >
        {/* Suggestion chips */}
        <div
          style={{
            display: "flex",
            gap: 7,
            marginBottom: 10,
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {["A debt collector", "The creditor directly", "I'm not sure"].map((chip, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 500,
                color: C.primary,
                background: C.verifiedBg,
                border: `1px solid ${C.verifiedBorder}`,
                borderRadius: 20,
                paddingInline: 12,
                paddingBlock: 6,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {chip}
            </div>
          ))}
        </div>

        {/* Input pill */}
        <div
          style={{
            background: C.surface,
            borderRadius: 26,
            border: `1.5px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            paddingInline: 6,
            paddingBlock: 6,
            gap: 2,
            boxShadow: "0 1px 6px rgba(28,27,24,0.06)",
          }}
        >
          {/* + button */}
          <div
            className="icon-btn"
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>

          {/* Text field */}
          <div style={{ flex: 1, paddingInline: 8 }}>
            <span style={{ fontSize: 15, color: C.textMuted, fontWeight: 400 }}>
              Or type your answer…
            </span>
          </div>

          {/* Mic */}
          <div
            className="icon-btn"
            style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          </div>

          {/* Send — amber active state */}
          <div
            className="send-active"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              background: C.amber,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 2px 8px ${C.amber}66`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.amberText} strokeWidth="2.8" strokeLinecap="round">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
