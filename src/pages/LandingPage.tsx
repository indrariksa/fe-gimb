import { LandingHero } from "../components/organisms/LandingHero";

export function LandingPage() {
  return (
    <>
      <LandingHero />
      <main className="landing-sections">
        <section id="tentang" className="content-band">
          <h2>Dari data operasional menjadi prioritas aksi.</h2>
          <p>Dashboard ini dirancang untuk UMKM yang butuh gambaran cepat: area bisnis mana yang sehat, mana yang rawan, dan input apa yang perlu dilengkapi untuk diagnosis berikutnya.</p>
        </section>
        <section id="fitur" className="feature-grid">
          {[
            ["Diagnosis 6 Dimensi", "Profitabilitas, cashflow, marketing, retensi, operasional, dan SDM dalam satu tampilan."],
            ["Form Inventarisasi", "Pertanyaan mengikuti dokumen input dan siap disimpan lokal sebelum integrasi backend."],
            ["Tema Fleksibel", "Nama aplikasi, bisnis, owner, dan warna utama bisa dikustomisasi langsung."],
          ].map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
