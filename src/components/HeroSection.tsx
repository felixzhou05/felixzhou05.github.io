import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/* ── Config ── */
const LINES = ["HAPPY", "ZHOU"];
const BASE_DELAY = 250; // ms before first letter appears
const STAGGER = 45; // ms between letters
const REPEL_RADIUS = 200; // px — how close the cursor must be
const REPEL_FORCE = 130; // px — max displacement
const LERP_PUSH = 0.14; // speed of push-away
const LERP_RETURN = 0.035; // speed of float-back (slow, dreamy)
const ENTRANCE_DUR = 650; // ms — matches CSS animation

interface LetterState {
  cx: number; // current offset x
  cy: number; // current offset y
  tx: number; // target offset x
  ty: number; // target offset y
}

export default function HeroSection() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const states = useRef<LetterState[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const [entranceDone, setEntranceDone] = useState(false);

  // Scroll parallax
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);
  const y = useTransform(scrollY, [0, 600], [0, -80]);

  // Count total letters
  const allLetters = LINES.flatMap((w) => w.split(""));
  const total = allLetters.length;

  // Initialize states array
  useEffect(() => {
    states.current = allLetters.map(() => ({ cx: 0, cy: 0, tx: 0, ty: 0 }));
  }, []);

  // Mark entrance complete
  useEffect(() => {
    const delay = BASE_DELAY + total * STAGGER + ENTRANCE_DUR + 100;
    const timer = setTimeout(() => setEntranceDone(true), delay);
    return () => clearTimeout(timer);
  }, [total]);

  // Interactive loop
  useEffect(() => {
    if (!entranceDone || reduced) return;

    function onMouseMove(e: MouseEvent) {
      mouse.current = { x: e.clientX, y: e.clientY };
    }
    function onMouseLeave() {
      mouse.current = { x: -9999, y: -9999 };
    }

    function tick() {
      const mx = mouse.current.x;
      const my = mouse.current.y;

      letterRefs.current.forEach((el, i) => {
        if (!el) return;
        const s = states.current[i];
        if (!s) return;

        // Get letter's "home" center (subtract current offset to get base position)
        const rect = el.getBoundingClientRect();
        const baseCx = rect.left + rect.width / 2 - s.cx;
        const baseCy = rect.top + rect.height / 2 - s.cy;

        const dx = baseCx - mx;
        const dy = baseCy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const strength = ((REPEL_RADIUS - dist) / REPEL_RADIUS) ** 1.5;
          const angle = Math.atan2(dy, dx);
          s.tx = Math.cos(angle) * strength * REPEL_FORCE;
          s.ty = Math.sin(angle) * strength * REPEL_FORCE;
        } else {
          s.tx = 0;
          s.ty = 0;
        }

        // Lerp — faster when pushing, slower when returning
        const isReturning = s.tx === 0 && s.ty === 0;
        const lerp = isReturning ? LERP_RETURN : LERP_PUSH;

        s.cx += (s.tx - s.cx) * lerp;
        s.cy += (s.ty - s.cy) * lerp;

        // Snap to zero when close enough (avoid sub-pixel jitter)
        if (isReturning && Math.abs(s.cx) < 0.3 && Math.abs(s.cy) < 0.3) {
          s.cx = 0;
          s.cy = 0;
        }

        el.style.transform = `translate(${s.cx}px, ${s.cy}px)`;
      });

      raf.current = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMouseMove);
    containerRef.current?.addEventListener("mouseleave", onMouseLeave);
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf.current);
    };
  }, [entranceDone, reduced]);

  // Build letter index for stagger delays
  let letterIdx = 0;

  const heroName = (
    <h1 className="t-hero select-none" aria-label="Happy Zhou" ref={containerRef}>
      {LINES.map((word, li) => (
        <span key={li} className="block overflow-hidden" style={{ lineHeight: 0.9 }}>
          <span className="inline-flex">
            {word.split("").map((char) => {
              const i = letterIdx++;
              const delay = BASE_DELAY + i * STAGGER;
              return (
                /* Outer: entrance slide (CSS animation) */
                <span
                  key={i}
                  className="inline-block letter-entrance"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  {/* Inner: interactive displacement (rAF) */}
                  <span
                    ref={(el) => { letterRefs.current[i] = el; }}
                    className="inline-block will-change-transform"
                  >
                    {char}
                  </span>
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </h1>
  );

  const subtitle = (
    <div className="mt-10 md:mt-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
      <p className="t-desc text-ink-2 max-w-sm hero-fade hero-d1">
        Software engineer building at the intersection of AI, finance, and
        automation. CS at Western University.
      </p>
      <p className="t-label text-ink-2 hero-fade hero-d2 scroll-bob">
        Scroll&ensp;&darr;
      </p>
    </div>
  );

  if (reduced) {
    return (
      <div>
        {heroName}
        {subtitle}
      </div>
    );
  }

  return (
    <motion.div style={{ opacity, y }}>
      {heroName}
      {subtitle}
    </motion.div>
  );
}
