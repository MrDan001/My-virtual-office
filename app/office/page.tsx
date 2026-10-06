"use client";

import OfficeView from "../../components/OfficeView";

export default function VirtualOfficePage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f5f8fb 0%,#eef3f7 100%)", padding: "22px", color: "#172338" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", color: "#3b74dd" }}>OPEN OFFICE SHELL</div>
            <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(24px,4vw,38px)", letterSpacing: "-.04em" }}>Virtual Office</h1>
            <p style={{ margin: 0, color: "#728097", fontSize: 14 }}>One open space only — no internal room demarcations, furniture or staff.</p>
          </div>
          <a href="/" style={{ border: "1px solid #d9e1ea", background: "#fff", color: "#172338", textDecoration: "none", borderRadius: 10, padding: "10px 13px", fontSize: 12, fontWeight: 800 }}>← Dashboard</a>
        </div>

        <section style={{ background: "#fff", border: "1px solid #dfe6ee", borderRadius: 18, overflow: "hidden", boxShadow: "0 18px 50px rgba(24,42,65,.08)" }}>
          <OfficeView />
        </section>
      </div>
    </main>
  );
}
