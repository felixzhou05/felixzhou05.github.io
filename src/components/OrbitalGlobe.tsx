import { useRef, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

/* ── Config ── */
const SPHERE_R = 220;
const LON_COUNT = 16;
const LAT_COUNT = 12;
const PTS_PER_LINE = 72;
const FOV = 600;
const AUTO_SPEED = 0.0015;
const DRAG_SENSITIVITY = 0.005;
const FRICTION = 0.95;        // velocity decay per frame
const CURSOR_GLOW_R = 200;
const CURSOR_BULGE = 30;

const RINGS = [
  { tiltX: 0.25, tiltZ: 0.12, radius: SPHERE_R + 40, speed: 0.007, dots: 100 },
  { tiltX: -0.55, tiltZ: -0.2, radius: SPHERE_R + 72, speed: -0.004, dots: 120 },
  { tiltX: 0.85, tiltZ: 0.35, radius: SPHERE_R + 55, speed: 0.0055, dots: 110 },
];

interface Vec3 { x: number; y: number; z: number }

function rY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c - p.z * s, y: p.y, z: p.x * s + p.z * c };
}
function rX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function rZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}
function proj(p: Vec3, cx: number, cy: number) {
  const s = FOV / (FOV + p.z);
  return { x: cx + p.x * s, y: cy + p.y * s, z: p.z };
}

export default function OrbitalGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const reduced = useReducedMotion();

  // Drag state
  const drag = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    velY: 0,     // rotational velocity around Y
    velX: 0,     // rotational velocity around X
    angleY: 0,   // accumulated drag rotation Y
    angleX: 0.2, // accumulated drag rotation X (slight initial tilt)
    mouseX: -9999,
    mouseY: -9999,
  });

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
    const d = drag.current;

    // ── Pointer events for drag ──
    function onPointerDown(e: PointerEvent) {
      d.active = true;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.velY = 0;
      d.velX = 0;
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      // Track cursor position for glow effect
      if (container) {
        const r = container.getBoundingClientRect();
        d.mouseX = e.clientX - r.left;
        d.mouseY = e.clientY - r.top;
      }

      if (!d.active) return;
      const dx = e.clientX - d.lastX;
      const dy = e.clientY - d.lastY;
      d.velY = dx * DRAG_SENSITIVITY;
      d.velX = -dy * DRAG_SENSITIVITY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
    }
    function onPointerUp() {
      d.active = false;
    }
    function onPointerLeave() {
      d.active = false;
      d.mouseX = -9999;
      d.mouseY = -9999;
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.style.touchAction = "none"; // prevent scroll while dragging globe
    canvas.style.cursor = "grab";

    let time = 0;

    function draw() {
      if (!canvas || !ctx) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);
      const cx = cw / 2, cy = ch / 2;

      // Apply velocity + friction
      if (!d.active) {
        d.velY *= FRICTION;
        d.velX *= FRICTION;
        // Auto-rotate when no drag momentum
        if (Math.abs(d.velY) < 0.0001) d.velY = 0;
        d.angleY += d.velY || AUTO_SPEED;
        d.angleX += d.velX;
      } else {
        d.angleY += d.velY;
        d.angleX += d.velX;
        canvas.style.cursor = "grabbing";
      }
      if (!d.active) canvas.style.cursor = "grab";

      // Clamp X rotation to avoid flipping
      d.angleX = Math.max(-1.2, Math.min(1.2, d.angleX));

      const rotYAngle = d.angleY;
      const rotXAngle = d.angleX;

      const style = getComputedStyle(document.documentElement);
      const color = style.getPropertyValue("--c-text").trim() || "#888";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Transform + optional cursor glow/bulge
      function tp(p: Vec3, radius: number) {
        let pt = rY(p, rotYAngle);
        pt = rX(pt, rotXAngle);
        const s = proj(pt, cx, cy);
        let alpha = 0.06 + 0.18 * ((radius - pt.z) / (radius * 2));

        if (d.mouseX > 0) {
          const ddx = s.x - d.mouseX;
          const ddy = s.y - d.mouseY;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < CURSOR_GLOW_R) {
            const t = 1 - dist / CURSOR_GLOW_R;
            alpha += t * 0.35;
            const bulge = t * t * CURSOR_BULGE;
            const fromCenter = Math.sqrt((s.x - cx) ** 2 + (s.y - cy) ** 2) || 1;
            s.x += ((s.x - cx) / fromCenter) * bulge;
            s.y += ((s.y - cy) / fromCenter) * bulge;
          }
        }
        return { x: s.x, y: s.y, z: pt.z, alpha: Math.max(0.03, Math.min(0.7, alpha)) };
      }

      // ── Sphere ──
      ctx.lineWidth = 0.7;
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
          const s = tp(p, SPHERE_R);
          ctx.globalAlpha = s.alpha;
          j === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
      }
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
          const s = tp(p, SPHERE_R);
          ctx.globalAlpha = s.alpha;
          j === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
      }

      // ── Rings ──
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
          p = rX(p, ring.tiltX);
          p = rZ(p, ring.tiltZ);
          const s = tp(p, ring.radius);
          ctx.globalAlpha = s.alpha;
          j === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();

        // Orbiting dot
        const da = phase * 3;
        let dp: Vec3 = { x: Math.cos(da) * ring.radius, y: 0, z: Math.sin(da) * ring.radius };
        dp = rX(dp, ring.tiltX);
        dp = rZ(dp, ring.tiltZ);
        const ds = tp(dp, ring.radius);
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
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />;
}
