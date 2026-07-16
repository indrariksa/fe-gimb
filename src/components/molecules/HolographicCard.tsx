import { useRef } from "react";
import type { HTMLAttributes, MouseEvent } from "react";

type HolographicCardProps = HTMLAttributes<HTMLElement>;

export function HolographicCard({ className = "", children, ...props }: HolographicCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = (y - rect.height / 2) / 26;
    const rotateY = (rect.width / 2 - x) / 26;

    card.style.setProperty("--holo-x", `${x}px`);
    card.style.setProperty("--holo-y", `${y}px`);
    card.style.setProperty("--holo-bg-x", `${(x / rect.width) * 100}%`);
    card.style.setProperty("--holo-bg-y", `${(y / rect.height) * 100}%`);
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
  };

  const resetCard = () => {
    const card = cardRef.current;
    if (!card) return;

    card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    card.style.setProperty("--holo-x", "50%");
    card.style.setProperty("--holo-y", "50%");
    card.style.setProperty("--holo-bg-x", "50%");
    card.style.setProperty("--holo-bg-y", "50%");
  };

  return (
    <article
      {...props}
      ref={cardRef}
      className={`holographic-card ${className}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetCard}
      onBlur={resetCard}
    >
      {children}
    </article>
  );
}
