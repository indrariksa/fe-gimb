import { motion, type Variants } from "motion/react";
import { LandingHero } from "../components/organisms/LandingHero";
import { Icon } from "../components/atoms/Icon";
import type { ComponentProps } from "react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const highlightFeature = {
  title: "Skor Kesehatan Bisnis 6 Dimensi",
  body: "Satu angka yang merangkum profitabilitas, cashflow, marketing, retensi, operasional, dan SDM supaya kamu tahu persis area mana yang perlu dibenahi lebih dulu.",
  icon: "grid" as ComponentProps<typeof Icon>["name"],
  dimensions: ["Profit", "Cashflow", "Marketing", "Retensi", "Operasional", "SDM"],
};

const steps = [
  { title: "Isi Data Bisnis", body: "Lengkapi form inventarisasi singkat: kondisi operasional, keuangan, marketing, dan tim." },
  { title: "Sistem Menganalisis", body: "Jawaban diproses jadi skor tiap dimensi dan dibandingkan dengan pola bisnis sejenis." },
  { title: "Terima Rekomendasi", body: "Dapatkan skor kesehatan bisnis, rencana aksi, atau laporan naratif AI sesuai skala usahamu." },
];

const features: Array<{ title: string; body: string; icon: ComponentProps<typeof Icon>["name"] }> = [
  { title: "Kelola Multi-Usaha", body: "Daftarkan dan pantau beberapa usaha dalam satu akun, masing-masing punya data inventarisasi serta histori diagnosis sendiri.", icon: "home" },
  { title: "Laporan Naratif AI", body: "Hasil diagnosis diterjemahkan jadi narasi bisnis yang mudah dipahami, lengkap konteks dan rekomendasinya.", icon: "file" },
  { title: "Ekspor Sekali Klik", body: "Unduh laporan dalam format PDF atau Excel, siap dibagikan ke tim atau dilampirkan ke pengajuan modal.", icon: "download" },
];

const sparkleCount = 6;

function IconBadge({ icon, size, large }: { icon: ComponentProps<typeof Icon>["name"]; size?: number; large?: boolean }) {
  return (
    <span className={large ? "feature-grid__icon feature-grid__icon--lg" : "feature-grid__icon"}>
      <Icon name={icon} size={size} />
      <span className="feature-grid__icon-sparkles" aria-hidden="true">
        {Array.from({ length: sparkleCount }).map((_, index) => (
          <i key={index} style={{ "--angle": `${(360 / sparkleCount) * index}deg`, "--delay": `${index * 0.03}s` } as React.CSSProperties} />
        ))}
      </span>
    </span>
  );
}

export function LandingPage() {
  return (
    <>
      <LandingHero />
      <main className="landing-sections">
        <motion.section
          id="tentang"
          className="content-band"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp}>Dari data operasional menjadi prioritas aksi.</motion.h2>
          <motion.p variants={fadeUp}>Dashboard ini dirancang untuk UMKM yang butuh gambaran cepat: area bisnis mana yang sehat, mana yang rawan, dan input apa yang perlu dilengkapi untuk diagnosis berikutnya.</motion.p>
          <motion.ol className="content-band__steps" variants={stagger}>
            {steps.map((step, index) => (
              <motion.li key={step.title} variants={fadeUp}>
                <span className="content-band__step-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </motion.section>
        <motion.section
          id="fitur"
          className="feature-grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.article className="feature-grid__highlight" variants={fadeUp} whileHover={{ y: -6 }}>
            <IconBadge icon={highlightFeature.icon} size={26} large />
            <div>
              <h3>{highlightFeature.title}</h3>
              <p>{highlightFeature.body}</p>
              <ul className="feature-grid__dims">
                {highlightFeature.dimensions.map((dim, index) => (
                  <li key={dim} style={{ "--i": index } as React.CSSProperties}>{dim}</li>
                ))}
              </ul>
            </div>
          </motion.article>
          {features.map(({ title, body, icon }) => (
            <motion.article key={title} variants={fadeUp} whileHover={{ y: -6 }}>
              <IconBadge icon={icon} />
              <h3>{title}</h3>
              <p>{body}</p>
            </motion.article>
          ))}
        </motion.section>
      </main>
    </>
  );
}
