import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, animate, motion, type Variants } from "motion/react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Brand } from "../molecules/Brand";
import { HolographicCard } from "../molecules/HolographicCard";
import { PublicThemeToggle } from "../molecules/PublicThemeToggle";
import { useThemeSettings } from "../../theme/ThemeContext";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

function AnimatedNumber({ value, suffix = "", delay = 0.5 }: { value: number; suffix?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(0, value, {
      duration: 1.5,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        node.textContent = `${Math.round(latest).toLocaleString("id-ID")}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [value, suffix, delay]);
  return <span ref={ref}>0{suffix}</span>;
}

const rotatingWords = ["Cepat", "Akurat", "Terukur", "Objektif", "Andal"];

function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => {
      setIndex((prev) => (prev === rotatingWords.length - 1 ? 0 : prev + 1));
    }, 2000);
    return () => clearTimeout(id);
  }, [index]);

  return (
    <span className="rotating-word">
      <AnimatePresence mode="wait">
        <motion.span
          key={rotatingWords[index]}
          className="rotating-word__item"
          initial={{ opacity: 0, y: "-100%" }}
          animate={{ opacity: 1, y: "0%" }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", stiffness: 50 }}
        >
          {rotatingWords[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const navSectionIds = ["beranda", "tentang", "fitur"];

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export function LandingHero() {
  const { theme } = useThemeSettings();
  const navigate = useNavigate();
  const activeSection = useScrollSpy(navSectionIds);

  return (
    <>
      <header className="landing__nav">
        <span className="landing__nav-dots" aria-hidden="true">
          <i /><i /><i />
        </span>
        <div className="landing__brand">
          <Brand name="SBD" compact />
          <small className="landing__brand-tagline">Monitoring · Diagnosa · Insight Bisnis</small>
        </div>
        <nav>
          <a href="#beranda" className={activeSection === "beranda" ? "active" : undefined}>Beranda</a>
          <a href="#tentang" className={activeSection === "tentang" ? "active" : undefined}>Tentang</a>
          <a href="#fitur" className={activeSection === "fitur" ? "active" : undefined}>Fitur</a>
        </nav>
        <div className="landing__nav-actions">
          <PublicThemeToggle />
          <div className="landing__nav-cta">
            <button className="landing__nav-cta__label" onClick={() => navigate("/dashboard")}>
              {"Login".split("").map((letter, index) => (
                <span key={index} className="landing__nav-cta__letter" style={{ "--i": index } as React.CSSProperties}>{letter}</span>
              ))}
            </button>
            <button className="landing__nav-cta__arrow" onClick={() => navigate("/dashboard")} aria-label="Masuk ke dashboard">
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>
      </header>

      <section className="landing">
      <div className="landing__aurora" aria-hidden="true">
        <span className="landing__aurora-blob landing__aurora-blob--a" />
        <span className="landing__aurora-blob landing__aurora-blob--b" />
        <span className="landing__aurora-blob landing__aurora-blob--c" />
      </div>

      <motion.div
        className="landing__content"
        id="beranda"
        initial="hidden"
        animate="show"
        variants={stagger}
      >
        <div className="landing__copy">
          <motion.span className="eyebrow" variants={fadeUp}><i /> Platform Analitik Bisnis #1 untuk UMKM Indonesia</motion.span>
          <motion.p className="product-kicker" variants={fadeUp}><span><Icon name="chart" /></span> Smart Business Dashboard</motion.p>
          <motion.h1 variants={fadeUp}>
            Diagnosa Kesehatan <strong>Bisnis</strong> yang <RotatingWord />
            <span className="landing__h1-line2">untuk <em>UMKM</em> Indonesia</span>
          </motion.h1>
          <motion.p className="lead" variants={fadeUp}>
            Sistem diagnostik berbasis data yang membantu mengidentifikasi masalah bisnis, mengukur performa secara objektif, dan memberi rekomendasi prioritas yang tepat sasaran.
          </motion.p>
          <motion.div className="landing__actions" variants={fadeUp}>
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="btn--shiny-dashboard" onClick={() => navigate("/inventory")}>Mulai Diagnosa <Icon name="arrow" size={20} /></Button>
            </motion.div>
          </motion.div>
          <motion.dl className="landing__stats" variants={fadeUp}>
            <div><dt>24/7</dt><dd>Bisa Diakses</dd></div>
            <div><dt><AnimatedNumber value={98} suffix="%" delay={0.72} /></dt><dd>Akurasi Analisis</dd></div>
            <div><dt><AnimatedNumber value={3} suffix=" Menit" delay={0.84} /></dt><dd>Waktu Diagnosa</dd></div>
          </motion.dl>
        </div>
        <motion.div
          className="hero-visual"
          aria-label={`Preview ${theme.appName}`}
          variants={fadeUp}
        >
          <HolographicCard className="hero-visual__panel">
            <span>Skor Kesehatan Bisnis</span>
            <div className="hero-score">
              <div><small>Total Skor</small><strong><AnimatedNumber value={42} delay={0.5} /></strong><b>Perlu Perbaikan</b></div>
              <div className="donut" style={{ "--donut-target": 42 } as React.CSSProperties}>42%</div>
            </div>
            <div className="hero-mini-grid">
              {["Profit", "Cashflow", "Marketing"].map((label, index) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong><AnimatedNumber value={[55, 40, 65][index]} delay={0.6 + index * 0.08} /></strong>
                  <i style={{ "--bar-target": `${[55, 40, 65][index]}%` } as React.CSSProperties} />
                </div>
              ))}
            </div>
            <div className="hero-bars">
              {Array.from({ length: 6 }).map((_, index) => (
                <i key={index} style={{ "--bar-delay": `${0.6 + index * 0.06}s` } as React.CSSProperties} />
              ))}
            </div>
          </HolographicCard>
          <motion.aside
            className="float-card float-card--top"
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Retensi <strong>+18% ↑</strong>
          </motion.aside>
          <motion.aside
            className="float-card float-card--bottom"
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Diagnosa <strong>Real-time</strong>
          </motion.aside>
        </motion.div>
      </motion.div>
      </section>
    </>
  );
}
