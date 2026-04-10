import { useRef, useState, useEffect } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#&*";

interface Props {
  text: string;
  className?: string;
  speed?: number; // frames between each character resolving (lower = faster)
}

/**
 * Text decode / scramble effect.
 * Characters resolve left-to-right while unresolved ones cycle randomly.
 * Triggered when the element enters the viewport.
 */
export default function TextScramble({ text, className = "", speed = 2 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [output, setOutput] = useState<string[]>(() => text.split("").map((c) => (c === " " ? " " : " ")));
  const [triggered, setTriggered] = useState(false);

  // Intersection observer — trigger once
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // Scramble animation
  useEffect(() => {
    if (!triggered) return;

    const target = text.split("");
    let frame = 0;
    let rafId: number;

    function tick() {
      const resolvedIdx = Math.floor(frame / speed);

      const next = target.map((char, i) => {
        if (char === " " || char === "," || char === "." || char === "'") return char;
        if (i <= resolvedIdx) return char;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      });

      setOutput(next);
      frame++;

      if (resolvedIdx < target.length) {
        rafId = requestAnimationFrame(tick);
      } else {
        setOutput(target);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [triggered, text, speed]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {output.map((char, i) => (
        <span key={i} className={char === text[i] ? "" : "text-ink-2"}>
          {char}
        </span>
      ))}
    </span>
  );
}
