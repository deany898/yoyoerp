export function SplashScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #0D1B2A 0%, #1E293B 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        zIndex: 9999,
        padding: 24,
      }}
    >
      <img
        src="/LOGO.png"
        alt="Yoyo"
        style={{
          width: 120,
          height: 120,
          objectFit: "contain",
          filter: "drop-shadow(0 8px 24px rgba(56,189,248,0.25))",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: 0.5, lineHeight: 1.1 }}>
          Yoyo
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
          Factory Management · योयो
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#38BDF8",
              animation: "yoyo-splash-bounce 1.2s infinite ease-in-out",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes yoyo-splash-bounce{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-6px)}}`}</style>
    </div>
  );
}
