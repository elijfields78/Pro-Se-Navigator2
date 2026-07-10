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
};

const cardShadow = "0 1px 2px rgba(28,27,24,0.04), 0 2px 10px rgba(28,27,24,0.07), 0 0 0 1px rgba(28,27,24,0.05)";

const nextSteps = [
  { label: "Someone is suing me", sub: "I was served papers or got a notice" },
  { label: "I want to take someone to court", sub: "I have a dispute or was wronged" },
  { label: "I received a court order", sub: "Something I need to respond to" },
];

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
        .step-row { transition: background 0.1s ease; cursor: pointer; }
        .step-row:active { background: rgba(15,110,86,0.04) !important; }
        .send-btn { transition: transform 0.1s ease, opacity 0.1s ease; cursor: pointer; }
        .send-btn:active { transform: scale(0.9); }
        .icon-btn { transition: background 0.1s ease; cursor: pointer; border-radius: 50%; }
        .icon-btn:active { background: rgba(28,27,24,0.06) !important; }
        .seg-pill { transition: all 0.18s ease; cursor: pointer; }
      `}</style>

      {/* Status bar */}
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 24, paddingTop: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>9:41</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>●●●</span>
      </div>

      {/* Nav header */}
      <div style={{ paddingInline: 16, paddingBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <div className="icon-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="2.2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: -0.2 }}>FCRA Dispute</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, fontWeight: 400 }}>Johnson v. Equifax · In progress</div>
        </div>
        <div className="icon-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
        </div>
      </div>

      {/* Segmented control */}
      <div style={{ paddingInline: 20, paddingBottom: 10 }}>
        <div style={{ background: C.border + "88", borderRadius: 10, padding: 3, display: "flex", gap: 2 }}>
          <div className="seg-pill" style={{ flex: 1, borderRadius: 8, background: C.surface, paddingBlock: 7, textAlign: "center", fontSize: 13, fontWeight: 600, color: C.text, boxShadow: "0 1px 4px rgba(28,27,24,0.08)" }}>
            Chat
          </div>
          <div className="seg-pill" style={{ flex: 1, borderRadius: 8, paddingBlock: 7, textAlign: "center", fontSize: 13, fontWeight: 500, color: C.textMuted }}>
            Artifacts
          </div>
        </div>
      </div>

      {/* Thin divider */}
      <div style={{ height: 1, background: C.border, marginInline: 0 }} />

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        
        {/* Navigator message 1 */}
        <div style={{ paddingInline: 20, paddingTop: 22, paddingBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.primary, letterSpacing: 0.8, textTransform: "uppercase" }}>Navigator</span>
          </div>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65, fontWeight: 400 }}>
            Welcome. I'm your Navigator.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65, fontWeight: 400, marginTop: 10 }}>
            I'll walk you through this one step at a time — no legal background needed. Everything you tell me stays private to this case.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65, fontWeight: 400, marginTop: 10 }}>
            First, tell me what's happening. What's the situation?
          </p>
        </div>

        {/* Next step rows */}
        <div style={{ marginInline: 20, marginTop: 14, borderRadius: 14, boxShadow: cardShadow, background: C.surface, overflow: "hidden" }}>
          {nextSteps.map((s, i) => (
            <div key={i}>
              <div className="step-row" style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.3 }}>{s.sub}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              {i < nextSteps.length - 1 && <div style={{ height: 1, background: C.border, marginInline: 14 }} />}
            </div>
          ))}
        </div>

        {/* Spacing between turns */}
        <div style={{ height: 24 }} />

        {/* User message */}
        <div style={{ paddingInline: 20, display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            background: C.verifiedBg,
            borderRadius: "18px 18px 4px 18px",
            paddingInline: 16,
            paddingBlock: 11,
            maxWidth: "82%",
            boxShadow: "0 1px 2px rgba(28,27,24,0.06)",
          }}>
            <p style={{ fontSize: 15, color: C.text, lineHeight: 1.55, fontWeight: 400 }}>
              Someone is suing me for a debt I don't recognize
            </p>
          </div>
        </div>

        {/* Turn spacing */}
        <div style={{ height: 24 }} />

        {/* Navigator message 2 (current) */}
        <div style={{ paddingInline: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.primary, letterSpacing: 0.8, textTransform: "uppercase" }}>Navigator</span>
          </div>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65 }}>
            Got it.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65, marginTop: 10 }}>
            Now let's figure out where your case belongs. I'll ask a few quick questions.
          </p>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.65, marginTop: 10 }}>
            Who is on the other side of this dispute?
          </p>
        </div>

        {/* Next steps for turn 2 */}
        <div style={{ marginInline: 20, marginTop: 14, borderRadius: 14, boxShadow: cardShadow, background: C.surface, overflow: "hidden" }}>
          {[
            { label: "Another person", sub: "Neighbor, landlord, someone I know, etc." },
            { label: "A company or business", sub: "Employer, store, bank, insurance, etc." },
            { label: "A government agency or official", sub: "City, state, police, IRS, etc." },
          ].map((s, i) => (
            <div key={i}>
              <div className="step-row" style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{s.sub}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              {i < 2 && <div style={{ height: 1, background: C.border, marginInline: 14 }} />}
            </div>
          ))}
        </div>

        {/* Action row: copy */}
        <div style={{ paddingInline: 20, marginTop: 10, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span style={{ fontSize: 12, color: C.textMuted }}>Copy</span>
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>

      {/* Input bar */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingInline: 14, paddingTop: 10, paddingBottom: 28, background: C.bg }}>
        <div style={{
          background: C.surface,
          borderRadius: 26,
          border: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          paddingInline: 6,
          paddingBlock: 6,
          gap: 2,
          boxShadow: "0 1px 4px rgba(28,27,24,0.05)",
        }}>
          <div className="icon-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div style={{ flex: 1, paddingInline: 4 }}>
            <span style={{ fontSize: 15, color: C.textMuted, fontWeight: 400 }}>Ask about your case…</span>
          </div>
          <div className="icon-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
            </svg>
          </div>
          <div className="send-btn" style={{ width: 34, height: 34, borderRadius: 17, background: C.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
