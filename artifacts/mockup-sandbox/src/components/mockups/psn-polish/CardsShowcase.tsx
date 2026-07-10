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
  destructive: "#DC2626",
  destructiveBg: "#FEF2F2",
};

const cardShadow = "0 1px 2px rgba(28,27,24,0.04), 0 2px 10px rgba(28,27,24,0.07), 0 0 0 1px rgba(28,27,24,0.05)";

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ paddingInline: 20, paddingTop: 22, paddingBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

export function CardsShowcase() {
  return (
    <div style={{
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      background: C.bg,
      minHeight: "100vh",
      maxWidth: 390,
      margin: "0 auto",
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card-press { transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease; cursor: pointer; }
        .card-press:active { transform: scale(0.986); opacity: 0.88; }
      `}</style>

      {/* Status bar */}
      <div style={{ height: 48, display: "flex", alignItems: "center", paddingInline: 24, paddingTop: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>9:41</span>
      </div>

      {/* Screen title */}
      <div style={{ paddingInline: 20, paddingTop: 4, paddingBottom: 0 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.7, color: C.text }}>Deadlines</h1>
      </div>

      <SectionHeader label="3 upcoming" />

      {/* Deadline cards */}
      <div style={{ paddingInline: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        
        {/* Overdue */}
        <div className="card-press" style={{
          background: C.destructiveBg,
          borderRadius: 16,
          padding: "15px 16px",
          boxShadow: `0 1px 2px rgba(220,38,38,0.06), 0 2px 10px rgba(220,38,38,0.08), 0 0 0 1px rgba(220,38,38,0.12)`,
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.destructive} strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.destructive }}>2 days overdue</span>
            <span style={{ fontSize: 12, color: C.destructive + "88", marginLeft: 2 }}>· Jul 8, 2025</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#7F1D1D", letterSpacing: -0.2, lineHeight: 1.3 }}>
            Defendant's answer to complaint
          </div>
          <div style={{ fontSize: 12, color: "#991B1B", fontWeight: 400 }}>Johnson v. Equifax</div>
          <div style={{ fontSize: 12, color: "#B91C1C" + "BB", marginTop: 1 }}>Fed. R. Civ. P. 12(a)(1)(A)(i)</div>
          <div style={{ fontSize: 11, color: C.destructive + "99", fontStyle: "italic" }}>Confirm against your court's rules.</div>
        </div>

        {/* Urgent */}
        <div className="card-press" style={{
          background: C.deadlineBg,
          borderRadius: 16,
          padding: "15px 16px",
          boxShadow: `0 1px 2px rgba(132,79,11,0.05), 0 2px 10px rgba(132,79,11,0.08), 0 0 0 1px rgba(132,79,11,0.1)`,
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.deadlineText} strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.deadlineText }}>4 days away</span>
            <span style={{ fontSize: 12, color: C.deadlineText + "88", marginLeft: 2 }}>· Jul 14, 2025</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#422006", letterSpacing: -0.2, lineHeight: 1.3 }}>
            Opposition to motion to dismiss
          </div>
          <div style={{ fontSize: 12, color: C.deadlineText, opacity: 0.8 }}>Smith v. Capital One</div>
          <div style={{ fontSize: 12, color: C.deadlineText + "BB", marginTop: 1 }}>Fed. R. Civ. P. 12(a)(4); check local rules</div>
          <div style={{ fontSize: 11, color: C.deadlineText + "88", fontStyle: "italic" }}>Confirm against your court's rules.</div>
        </div>

        {/* Normal / Future */}
        <div className="card-press" style={{
          background: C.surface,
          borderRadius: 16,
          padding: "15px 16px",
          boxShadow: cardShadow,
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>Aug 14, 2025</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: -0.2, lineHeight: 1.3 }}>
            Notice of appeal deadline
          </div>
          <div style={{ fontSize: 12, color: C.textSec }}>Traffic Citation — July 4</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>Fed. R. App. P. 4(a)(1)(A)</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>Confirm against your court's rules.</div>
        </div>
      </div>

      {/* Artifacts section */}
      <SectionHeader label="Artifacts · 2" />

      <div style={{ paddingInline: 20, display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>
        
        {/* Motion artifact */}
        <div className="card-press" style={{
          background: C.surface,
          borderRadius: 16,
          padding: "15px 16px",
          boxShadow: cardShadow,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingRight: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.verifiedBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: -0.15, lineHeight: 1.3 }}>Defendant's Answer</div>
              <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>Johnson v. Equifax</div>
            </div>
            <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>2h ago</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.primary, background: C.verifiedBg, paddingInline: 8, paddingBlock: 3, borderRadius: 6 }}>Motion</span>
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            [Placeholder draft for "Defendant's Answer". Full AI generation arrives in Phase 6.]
          </p>
          <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* Letter artifact */}
        <div className="card-press" style={{
          background: C.surface,
          borderRadius: 16,
          padding: "15px 16px",
          boxShadow: cardShadow,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingRight: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF4E5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92500A" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: -0.15, lineHeight: 1.3 }}>Dispute Letter</div>
              <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>Johnson v. Equifax</div>
            </div>
            <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>Yesterday</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#92500A", background: "#FFF4E5", paddingInline: 8, paddingBlock: 3, borderRadius: 6 }}>Letter</span>
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            [Placeholder draft for "Dispute Letter". Full AI generation arrives in Phase 6.]
          </p>
          <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
