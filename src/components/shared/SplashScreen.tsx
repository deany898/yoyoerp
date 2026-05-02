export function SplashScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        zIndex: 9999,
      }}
    >
      <img
        src="/LOGO.png"
        alt="Yoyo"
        style={{ width: 96, height: 96, borderRadius: 20, background: "#fff", padding: 12 }}
      />
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>Yoyo</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#38BDF8",
              animation: `yoyo-splash-bounce 1.2s infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes yoyo-splash-bounce{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}