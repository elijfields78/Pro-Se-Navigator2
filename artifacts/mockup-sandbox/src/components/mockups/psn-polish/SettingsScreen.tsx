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
  destructive: "#DC2626",
};

const cardShadow = "0 1px 2px rgba(28,27,24,0.04), 0 2px 10px rgba(28,27,24,0.07), 0 0 0 1px rgba(28,27,24,0.05)";

function MenuRow({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value?: string; danger?: boolean }) {
  return (
    <div className="menu-row" style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      paddingInline: 16,
      paddingBlock: 14,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: danger ? "#FEF2F2" : C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 400, color: danger ? C.destructive : C.text }}>
        {label}
      </span>
      {value ? (
        <span style={{ fontSize: 14, color: C.textMuted }}>{value}</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={danger ? C.destructive + "66" : C.border} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, marginInline: 16 }} />;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginInline: 20,
      background: C.surface,
      borderRadius: 16,
      boxShadow: cardShadow,
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ paddingInline: 20, paddingTop: 20, paddingBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

const iconColor = (c: string) => c;

export function SettingsScreen() {
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
        .menu-row { transition: background 0.1s ease; cursor: pointer; }
        .menu-row:active { background: rgba(28,27,24,0.03) !important; }
        .pill-btn { transition: transform 0.12s ease, opacity 0.12s ease; cursor: pointer; }
        .pill-btn:active { transform: scale(0.97); opacity: 0.88; }
      `}</style>

      {/* Status bar */}
      <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 24, paddingTop: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>9:41</span>
      </div>

      {/* Title */}
      <div style={{ paddingInline: 20, paddingTop: 4, paddingBottom: 20 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.7, color: C.text }}>Account</h1>
      </div>

      {/* Profile card */}
      <div style={{
        marginInline: 20,
        background: C.surface,
        borderRadius: 20,
        padding: "20px 20px 18px",
        boxShadow: cardShadow,
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}>
        {/* Avatar */}
        <div style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          background: C.verifiedBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 0 2px ${C.primary}22, 0 2px 8px rgba(15,110,86,0.12)`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.primary, letterSpacing: 0.5 }}>JD</span>
        </div>

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>Jane Doe</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 3, fontWeight: 400 }}>jane@example.com</div>
          <div style={{ marginTop: 8 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.textMuted,
              border: `1.5px solid ${C.border}`,
              borderRadius: 6,
              paddingInline: 8,
              paddingBlock: 3,
              letterSpacing: 0.3,
            }}>
              Free Plan
            </span>
          </div>
        </div>
      </div>

      {/* Usage mini preview */}
      <SectionLabel label="Usage" />
      <SectionCard>
        <div style={{ paddingInline: 16, paddingBlock: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>AI Messages</span>
            <span style={{ fontSize: 13, color: C.textMuted }}>3 / 40</span>
          </div>
          <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: "7.5%", height: "100%", background: C.primary, borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>Resets Aug 1, 2025</div>
        </div>
        <Divider />
        <MenuRow
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          label="Usage & Credits"
        />
      </SectionCard>

      {/* Content */}
      <SectionLabel label="Documents" />
      <SectionCard>
        <MenuRow
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
          label="Artifacts Archive"
        />
      </SectionCard>

      {/* Account */}
      <SectionLabel label="Account" />
      <SectionCard>
        <MenuRow
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          label="Edit Profile"
        />
        <Divider />
        <MenuRow
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.destructive} strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          }
          label="Sign out"
          danger
        />
      </SectionCard>

      {/* Upgrade CTA */}
      <div style={{ paddingInline: 20, paddingTop: 20 }}>
        <div className="pill-btn" style={{
          background: C.amber,
          borderRadius: 14,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: `0 2px 12px ${C.amber}55`,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.amberText} strokeWidth="2.2" strokeLinecap="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.amberText }}>Upgrade to Pro</span>
        </div>
      </div>

      {/* Legal */}
      <SectionLabel label="Legal" />
      <SectionCard>
        <MenuRow
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
          label="Terms of Service"
        />
        <Divider />
        <MenuRow
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
          label="Privacy Policy"
        />
      </SectionCard>

      <div style={{ paddingTop: 16, paddingBottom: 32, textAlign: "center" }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>Pro Se Navigator · v1.0.0</span>
        <div style={{ fontSize: 11, color: C.textMuted + "99", marginTop: 4 }}>Not legal advice.</div>
      </div>
    </div>
  );
}
