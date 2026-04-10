import { useState, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";

interface Props {
  num: string;
  title: string;
  desc: string;
  href: string | null;
  color: string; // single oklch color for the blob
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SPRING = { stiffness: 200, damping: 30, mass: 0.6 };

export default function ProjectRow({ num, title, desc, href, color }: Props) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef<HTMLElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  function onMove(e: React.MouseEvent) {
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    rawX.set(e.clientX - rect.left);
    rawY.set(e.clientY - rect.top);
  }

  const inner = (
    <motion.article
      ref={rowRef}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative border-t border-line overflow-hidden"
    >
      {/* ── Blurred cursor-following blob (desktop) ── */}
      <motion.div
        className="pointer-events-none absolute w-[320px] h-[320px] rounded-full hidden md:block"
        style={{
          left: x,
          top: y,
          translateX: "-50%",
          translateY: "-50%",
          background: color,
          filter: "blur(70px)",
        }}
        animate={{
          opacity: hovered ? 0.5 : 0,
          scale: hovered ? 1 : 0.4,
        }}
        transition={{ duration: 0.4, ease: EASE }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 py-14 md:py-20">
        <div className="grid md:grid-cols-[5rem_1fr] gap-4 md:gap-8">
          <span className="t-label text-ink-2 md:pt-4">{num}</span>
          <div>
            <motion.h3
              className="t-project"
              animate={reduced ? {} : { x: hovered ? 10 : 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {title}
            </motion.h3>
            <p className="t-desc text-ink-2 mt-5 md:mt-6 max-w-xl">{desc}</p>
            {href && (
              <motion.span
                className="inline-block mt-5 t-label text-ink-2"
                animate={reduced ? {} : { x: hovered ? 6 : 0, opacity: hovered ? 1 : 0.6 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                View Project &rarr;
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}
