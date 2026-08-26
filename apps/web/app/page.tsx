export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "72px 24px" }}>
      <p
        style={{
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        KHLIM
      </p>
      <h1
        style={{
          fontSize: "clamp(2.25rem, 6vw, 4.75rem)",
          lineHeight: 1,
          margin: "16px 0",
        }}
      >
        Digital Sports Ecosystem
      </h1>
      <p style={{ maxWidth: 680, fontSize: "1.125rem", lineHeight: 1.7 }}>
        Website foundation active. Public academy discovery, family
        registration, memberships and secure payments will be built on this
        client while sharing the same KHLIM API with staff tools and the later
        Super App.
      </p>
    </main>
  );
}
