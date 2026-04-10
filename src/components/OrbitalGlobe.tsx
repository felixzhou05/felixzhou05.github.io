import { useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

/* ── Config ── */
const SPHERE_R = 220;
const LON_COUNT = 16;
const LAT_COUNT = 12;
const PTS_PER_LINE = 72;
const FOV = 600;
const BASE_SPEED = 0.002;
const HOVER_SPEED = 0.008; // faster rotation when cursor is over globe
const CURSOR_GLOW_R = 200; // px — how far cursor brightens wireframe
const CURSOR_BULGE = 35;   // px — how far points bulge toward cursor

const RINGS = [
  { tiltX: 0.25, tiltZ: 0.12, radius: SPHERE_R + 40, speed: 0.007, dots: 100 },
  { tiltX: -0.55, tiltZ: -0.2, radius: SPHERE_R + 72, speed: -0.004, dots: 120 },
  { tiltX: 0.85, tiltZ: 0.35, radius: SPHERE_R + 55, speed: 0.0055, dots: 110 },
];

interface Vec3 { x: number; y: number; z: number }

function rotY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c };
}
function rotX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function rotZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}
function proj(p: Vec3, cx: number, cy: number): { x: number; y: number; z: number } {
  const s = FOV / (FOV + p.z);
  return { x: cx + p.x * s, y: cy + p.y * s, z: p.z };
}

export default function OrbitalGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ nx: 0.5, ny: 0.5, px: -9999, py: -9999, over: false });
  const raf = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function getContainer(): HTMLElement | null {
      let el: HTMLElement | null = canvas!.parentElement;
      while (el && el.clientHeight === 0) el = el.parentElement;
      return el;
    }

    function resize() {
      if (!canvas) return;
      const c = getContainer();
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const container = getContainer();
    function onMouseMove(e: MouseEvent) {
      if (!container) return;
      const r = container.getBoundingClientRect();
      mouse.current.nx = (e.clientX - r.left) / r.width;
      mouse.current.ny = (e.clientY - r.top) / r.height;
      mouse.current.px = e.clientX - r.left;
      mouse.current.py = e.clientY - r.top;
      mouse.current.over = true;
    }
    function onMouseLeave() {
      mouse.current.over = false;
    }
    (container || canvas).addEventListener("mousemove", onMouseMove);
    (container || canvas).addEventListener("mouseleave", onMouseLeave);

    let time = 0;
    let smoothSpeed = BASE_SPEED;

    function draw() {
      if (!canvas || !ctx) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);

      const cx = cw / 2;
      const cy = ch / 2;
      const m = mouse.current;

      // Smooth speed transition
      const targetSpeed = m.over ? HOVER_SPEED : BASE_SPEED;
      smoothSpeed += (targetSpeed - smoothSpeed) * 0.03;

      // Mouse-driven tilt
      const tY = (m.nx - 0.5) * 0.5;
      const tX = (m.ny - 0.5) * -0.35;
      const ry = time * smoothSpeed + tY;
      const rx = 0.2 + tX;

      const style = getComputedStyle(document.documentElement);
      const color = style.getPropertyValue("--c-text").trim() || "#888";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Helper: transform, optionally bulge toward cursor, then project
      function transformAndProject(p: Vec3, radius: number): { x: number; y: number; z: number; alpha: number } {
        let pt = rotY(p, ry);
        pt = rotX(pt, rx);
        const s = proj(pt, cx, cy);

        // Depth-based base alpha
        let alpha = 0.06 + 0.18 * ((radius - pt.z) / (radius * 2));

        // Cursor proximity glow + bulge
        if (m.over) {
          const dx = s.x - m.px;
          const dy = s.y - m.py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CURSOR_GLOW_R) {
            const t = 1 - dist / CURSOR_GLOW_R;
            alpha += t * 0.4; // brighter near cursor
            // Bulge: push point outward from sphere center toward cursor
            const bulge = t * t * CURSOR_BULGE;
            s.x += (s.x - cx) / Math.max(1, Math.sqrt((s.x - cx) ** 2 + (s.y - cy) ** 2)) * bulge;
            s.y += (s.y - cy) / Math.max(1, Math.sqrt((s.x - cx) ** 2 + (s.y - cy) ** 2)) * bulge;
          }
        }

        return { x: s.x, y: s.y, z: pt.z, alpha: Math.max(0.03, Math.min(0.7, alpha)) };
      }

      // ─── Sphere wireframe ───
      ctx.lineWidth = 0.7;

      // Longitude
      for (let i = 0; i < LON_COUNT; i++) {
        const lon = (i / LON_COUNT) * Math.PI * 2;
        ctx.beginPath();
        for (let j = 0; j <= PTS_PER_LINE; j++) {
          const lat = (j / PTS_PER_LINE) * Math.PI - Math.PI / 2;
          const p: Vec3 = {
            x: Math.cos(lat) * Math.sin(lon) * SPHERE_R,
            y: Math.sin(lat) * SPHERE_R,
            z: Math.cos(lat) * Math.cos(lon) * SPHERE_R,
          };
          const s = transformAndProject(p, SPHERE_R);
          ctx.globalAlpha = s.alpha;
          if (j === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
      }

      // Latitude
      for (let i = 1; i < LAT_COUNT; i++) {
        const lat = (i / LAT_COUNT) * Math.PI - Math.PI / 2;
        ctx.beginPath();
        for (let j = 0; j <= PTS_PER_LINE; j++) {
          const lon = (j / PTS_PER_LINE) * Math.PI * 2;
          const p: Vec3 = {
            x: Math.cos(lat) * Math.sin(lon) * SPHERE_R,
            y: Math.sin(lat) * SPHERE_R,
            z: Math.cos(lat) * Math.cos(lon) * SPHERE_R,
          };
          const s = transformAndProject(p, SPHERE_R);
          ctx.globalAlpha = s.alpha;
          if (j === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
      }

      // ─── Orbiting rings ───
      RINGS.forEach((ring) => {
        const phase = time * ring.speed;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j <= ring.dots; j++) {
          const angle = (j / ring.dots) * Math.PI * 2;
          let p: Vec3 = {
            x: Math.cos(angle) * ring.radius,
            y: 0,
            z: Math.sin(angle) * ring.radius,
          };
          p = rotX(p, ring.tiltX);
          p = rotZ(p, ring.tiltZ);
          const s = transformAndProject(p, ring.radius);
          ctx.globalAlpha = s.alpha;
          if (j === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();

        // Orbiting dot
        const dotAngle = phase * 3;
        let dp: Vec3 = {
          x: Math.cos(dotAngle) * ring.radius,
          y: 0,
          z: Math.sin(dotAngle) * ring.radius,
        };
        dp = rotX(dp, ring.tiltX);
        dp = rotZ(dp, ring.tiltZ);
        const ds = transformAndProject(dp, ring.radius);
        ctx.globalAlpha = Math.min(0.8, ds.alpha + 0.3);
        ctx.beginPath();
        ctx.arc(ds.x, ds.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      time++;
      raf.current = requestAnimationFrame(draw);
    }

    if (!reduced) {
      raf.current = requestAnimationFrame(draw);
    } else {
      time = 100;
      draw();
      cancelAnimationFrame(raf.current);
    }

    return () => {
      window.removeEventListener("resize", resize);
      (container || canvas).removeEventListener("mousemove", onMouseMove);
      (container || canvas).removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />;
}
