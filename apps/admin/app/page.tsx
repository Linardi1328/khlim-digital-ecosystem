export default function AdminHomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>KHLIM Staff</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 1.05, margin: "16px 0" }}>
        Operations Console
      </h1>
      <p style={{ maxWidth: 680, fontSize: "1.125rem", lineHeight: 1.7 }}>
        Admin runtime foundation active. Programme, membership, billing, venue and scheduling operations will be added here behind server-enforced permissions.
      </p>
    </main>
  );
}
