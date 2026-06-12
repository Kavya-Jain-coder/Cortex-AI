"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────
type SceneId =
  | "splash"
  | "welcome"
  | "signin-email"
  | "signin-password"
  | "signup-name"
  | "signup-email"
  | "signup-field"
  | "signup-password"
  | "final";

interface BgConfig {
  src: string;
  position: string;
  opacity: number;
}

// ─── Scene → Background mapping ─────────────────────────────────────────────
const SCENE_BG: Record<SceneId, BgConfig> = {
  splash:           { src: "/images/SL_073119_22070_26.jpg", position: "top center",   opacity: 0.85 },
  welcome:          { src: "/images/5488909.jpg",            position: "center",        opacity: 0.90 },
  "signin-email":   { src: "/images/SL_073119_22070_26.jpg", position: "top right",     opacity: 0.80 },
  "signin-password":{ src: "/images/6820263.jpg",            position: "bottom left",   opacity: 0.85 },
  "signup-name":    { src: "/images/12456.jpg",              position: "top left",       opacity: 0.70 },
  "signup-email":   { src: "/images/5488909.jpg",            position: "bottom right",  opacity: 0.90 },
  "signup-field":   { src: "/images/SL_073119_22070_26.jpg", position: "center left",   opacity: 0.80 },
  "signup-password":{ src: "/images/6820263.jpg",            position: "top right",     opacity: 0.85 },
  final:            { src: "",                               position: "center",        opacity: 0 },
};

// ─── Scene → Card position ──────────────────────────────────────────────────
const SCENE_POS: Record<SceneId, React.CSSProperties> = {
  splash:           {},
  welcome:          { bottom: 80, left: 80 },
  "signin-email":   { top: 80, right: 80 },
  "signin-password":{ bottom: 80, right: 80 },
  "signup-name":    { top: 80, left: 80 },
  "signup-email":   { bottom: 80, left: 80 },
  "signup-field":   { top: 80, right: 80 },
  "signup-password":{ bottom: 80, right: 80 },
  final:            { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

// ─── Scene → Step label ─────────────────────────────────────────────────────
const SCENE_LABEL: Record<SceneId, string> = {
  splash: "",
  welcome: "",
  "signin-email": "SIGN IN · STEP 1 OF 2",
  "signin-password": "SIGN IN · STEP 2 OF 2",
  "signup-name": "CREATE ACCOUNT · STEP 1 OF 4",
  "signup-email": "CREATE ACCOUNT · STEP 2 OF 4",
  "signup-field": "CREATE ACCOUNT · STEP 3 OF 4",
  "signup-password": "CREATE ACCOUNT · STEP 4 OF 4",
  final: "",
};

// ─── Scene → Progress dot index (0-based, -1 = hidden) ─────────────────────
const SCENE_DOT: Record<SceneId, number> = {
  splash: -1,
  welcome: 0,
  "signin-email": 1,
  "signin-password": 2,
  "signup-name": 1,
  "signup-email": 2,
  "signup-field": 3,
  "signup-password": 4,
  final: -1,
};

// ─── Card Directions Configuration ──────────────────────────────────────────
const CARD_ANIMATIONS: Record<SceneId, [string | null, string]> = {
  splash:            [null, "center"],
  welcome:           ["bottom-left", "bottom-left"],
  "signin-email":    ["bottom-left→top-right", "top-right"],
  "signin-password": ["top-right→bottom-right", "bottom-right"],
  "signup-name":     ["bottom-right→top-left", "top-left"],
  "signup-email":    ["top-left→bottom-left", "bottom-left"],
  "signup-field":    ["bottom-left→top-right", "top-right"],
  "signup-password": ["top-right→bottom-right", "bottom-right"],
  final:             ["bottom-right→center", "center"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper functions for animations
// ═══════════════════════════════════════════════════════════════════════════════
function createRipple(x: number, y: number, prefersReducedMotion: boolean) {
  if (prefersReducedMotion) return;
  const ripple = document.createElement("div");
  ripple.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 0; height: 0;
    border-radius: 50%;
    background: transparent;
    border: 1.5px solid rgba(201,168,76,0.6);
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 100;
  `;
  document.body.appendChild(ripple);
  ripple
    .animate(
      [
        { width: "0px", height: "0px", opacity: 0.8, borderColor: "rgba(201,168,76,0.6)" },
        { width: "200px", height: "200px", opacity: 0, borderColor: "rgba(201,168,76,0)" },
      ],
      { duration: 600, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
    )
    .onfinish = () => ripple.remove();
}

function getDirectionOffset(direction: string | null, distance: number) {
  if (!direction) return { x: 0, y: 0 };
  switch (direction) {
    case "bottom-left":
      return { x: -distance, y: distance };
    case "top-right":
      return { x: distance, y: -distance };
    case "bottom-right":
      return { x: distance, y: distance };
    case "top-left":
      return { x: -distance, y: -distance };
    case "center":
      return { x: 0, y: distance };
    default:
      return { x: 0, y: 0 };
  }
}

function getExitDirection(dir: string | null, isForward: boolean): string | null {
  if (!dir) return null;
  if (dir.includes("→")) {
    const parts = dir.split("→");
    return (isForward ? parts[1] : parts[0]) ?? null;
  }
  return dir;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Particle Canvas
// ═══════════════════════════════════════════════════════════════════════════════
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const nodes: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; dying: boolean }[] = [];
    const NODE_COUNT = 60;
    const MAX_DIST = 110;

    function resize() {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 0.5 + Math.random() * 1.6,
        alpha: 0.5,
        dying: false,
      });
    }

    function resetNodes() {
      if (!canvas) return;
      nodes.length = 0;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: centerX + (Math.random() - 0.5) * 10,
          y: centerY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 0.5 + Math.random() * 1.6,
          alpha: 0.5,
          dying: false,
        });
      }
    }

    function triggerParticleBurst(originX: number, originY: number) {
      const prefersMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersMotion) return;

      const isMobileDevice = window.innerWidth < 768;
      if (isMobileDevice) return; // skip particle burst under 768px

      nodes.forEach((node) => {
        const dx = node.x - originX;
        const dy = node.y - originY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        node.vx = (dx / dist) * 18 + (Math.random() - 0.5) * 8;
        node.vy = (dy / dist) * 18 + (Math.random() - 0.5) * 8;
        node.dying = true;
        node.alpha = 1;
      });

      if (canvas) {
        canvas.style.willChange = "transform";
      }

      setTimeout(() => {
        if (canvas) {
          canvas.style.willChange = "auto";
        }
        resetNodes();
      }, 800);
    }

    (window as any).triggerParticleBurst = triggerParticleBurst;

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        if (n.dying) {
          n.alpha -= 0.035;
          if (n.alpha < 0) n.alpha = 0;
        }
      }

      // Draw lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          if (a.dying || b.dying) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.15;
            ctx.strokeStyle = `rgba(201,168,76,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.fillStyle = `rgba(201,168,76,${n.dying ? n.alpha : 0.5})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      delete (window as any).triggerParticleBurst;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Progress Dots
// ═══════════════════════════════════════════════════════════════════════════════
function ProgressDots({ active, total }: { active: number; total: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        zIndex: 30,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === active ? 14 : 6,
            height: 6,
            borderRadius: i === active ? 3 : 3,
            background: i === active ? "#c9a84c" : "rgba(201,168,76,0.18)",
            transition: "all 400ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Animated Checkmark SVG
// ═══════════════════════════════════════════════════════════════════════════════
function AnimatedCheckmark() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: "0 auto 20px" }}>
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="#c9a84c"
        strokeWidth="2"
        fill="none"
        strokeDasharray="176"
        strokeDashoffset="176"
        style={{ animation: "drawCircle 0.7s ease forwards" }}
      />
      <path
        d="M20 33 L28 41 L44 25"
        stroke="#c9a84c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="40"
        strokeDashoffset="40"
        style={{ animation: "drawCheck 0.4s ease 0.5s forwards" }}
      />
      <style>{`
        @keyframes drawCircle { to { stroke-dashoffset: 0; } }
        @keyframes drawCheck { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function AuthPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // ─── Scene state ──────────────────────────────────────────────────────────
  const [scene, setScene] = useState<SceneId>("splash");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(true);
  const [history, setHistory] = useState<SceneId[]>([]);

  // ─── Form state ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Splash loading entrance sequence state ──────────────────────────────
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [bgVisible, setBgVisible] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);

  // ─── Success Scene finale state ──────────────────────────────────────────
  const [successTitleVisible, setSuccessTitleVisible] = useState(false);
  const [successSubVisible, setSuccessSubVisible] = useState(false);
  const [successZoom, setSuccessZoom] = useState(false);
  const [successBlackout, setSuccessBlackout] = useState(false);

  // ─── Transition Animation State ──────────────────────────────────────────
  const [bgWarpState, setBgWarpState] = useState<"none" | "leaving" | "entering" | "on">("none");
  const [prevBgSrc, setPrevBgSrc] = useState<string>("");
  const [cardState, setCardState] = useState<"entered" | "exiting" | "entering">("entered");
  const [isBackTransition, setIsBackTransition] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const vortexRef = useRef<HTMLDivElement>(null);
  const lastClickRef = useRef<{ x: number; y: number } | null>(null);

  // ─── Detect Screen Size ──────────────────────────────────────────────────
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Track Click Coordinates ─────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      lastClickRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, []);

  // ─── Splash auto-advance ─────────────────────────────────────────────────
  useEffect(() => {
    if (scene !== "splash") return;
    
    // Reset splash animation states
    setCanvasVisible(false);
    setBgVisible(false);
    setScannerActive(false);
    setLogoVisible(false);
    setTaglineVisible(false);

    const t1 = setTimeout(() => setCanvasVisible(true), 200);
    const t2 = setTimeout(() => setBgVisible(true), 600);
    const t3 = setTimeout(() => setScannerActive(true), 800);
    const t4 = setTimeout(() => setLogoVisible(true), 1400);
    const t5 = setTimeout(() => setTaglineVisible(true), 2200);
    const t6 = setTimeout(() => goTo("welcome"), 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // ─── Final success auto-redirect sequence ────────────────────────────────
  useEffect(() => {
    if (scene !== "final") return;

    setSuccessTitleVisible(false);
    setSuccessSubVisible(false);
    setSuccessZoom(false);
    setSuccessBlackout(false);

    const t1 = setTimeout(() => setSuccessTitleVisible(true), 800);
    const t2 = setTimeout(() => setSuccessSubVisible(true), 1200);
    const t3 = setTimeout(() => setSuccessZoom(true), 1800);

    // 2200ms: Inward vortex collapse
    const t4 = setTimeout(() => {
      const vortexEl = vortexRef.current;
      if (vortexEl) {
        vortexEl.style.setProperty("--vx", "50%");
        vortexEl.style.setProperty("--vy", "50%");
        vortexEl.style.willChange = "transform, opacity, filter";

        const prefersMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersMotion) {
          const isMobileDevice = window.innerWidth < 768;
          let keyframes = [
            { opacity: 0, transform: "scale(2.5)", filter: "blur(20px)" },
            { opacity: 0.9, transform: "scale(1)", filter: "blur(8px)", offset: 0.5 },
            { opacity: 1, transform: "scale(0)", filter: "blur(0px)" },
          ];
          if (isMobileDevice) {
            keyframes = [
              { opacity: 0, transform: "scale(2.5)", filter: "none" },
              { opacity: 0.9, transform: "scale(1)", filter: "none", offset: 0.5 },
              { opacity: 1, transform: "scale(0)", filter: "none" },
            ];
          }

          vortexEl.animate(keyframes, {
            duration: 800,
            easing: "cubic-bezier(0.55, 0, 1, 0.45)",
            fill: "forwards",
          });
        }
      }
    }, 2200);

    // 2600ms: Pure black screen
    const t5 = setTimeout(() => setSuccessBlackout(true), 2600);

    // 2800ms: Router push
    const t6 = setTimeout(() => {
      router.push("/notes");
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [scene, router]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const goTo = useCallback((next: SceneId) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setIsBackTransition(false); // Reset to ensure forward animations run

    // Determine target origin point
    let clickX = lastClickRef.current?.x;
    let clickY = lastClickRef.current?.y;
    lastClickRef.current = null;

    if (clickX === undefined || clickY === undefined) {
      const cardEl = document.querySelector(".auth-card");
      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        clickX = rect.left + rect.width / 2;
        clickY = rect.top + rect.height / 2;
      } else {
        clickX = window.innerWidth / 2;
        clickY = window.innerHeight / 2;
      }
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Simple 300ms opacity crossfade only
      setSceneVisible(false);
      setTimeout(() => {
        setHistory((h) => [...h, scene]);
        setScene(next);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setSceneVisible(true));
        });
        setIsTransitioning(false);
      }, 300);
      return;
    }

    // 0ms: Spawn click gold ripple
    createRipple(clickX, clickY, prefersReducedMotion);

    // 80ms: Particle burst, Card exit state, Vortex starts
    setTimeout(() => {
      // Outward Particle Burst
      if ((window as any).triggerParticleBurst) {
        (window as any).triggerParticleBurst(clickX, clickY);
      }

      // Card exit state
      setCardState("exiting");

      // Vortex overlay
      const vortexEl = vortexRef.current;
      if (vortexEl) {
        const vxPercent = (clickX! / window.innerWidth) * 100;
        const vyPercent = (clickY! / window.innerHeight) * 100;
        vortexEl.style.setProperty("--vx", `${vxPercent}%`);
        vortexEl.style.setProperty("--vy", `${vyPercent}%`);
        vortexEl.style.willChange = "transform, opacity, filter";

        const isMobileDevice = window.innerWidth < 768;
        let keyframes = [
          { opacity: 0, transform: "scale(0)", filter: "blur(0px)" },
          { opacity: 0.6, transform: "scale(1)", filter: "blur(8px)", offset: 0.4 },
          { opacity: 0.95, transform: "scale(1.5)", filter: "blur(22px)", offset: 0.6 },
          { opacity: 0, transform: "scale(2.5)", filter: "blur(0px)" },
        ];
        if (isMobileDevice) {
          keyframes = [
            { opacity: 0, transform: "scale(0)", filter: "none" },
            { opacity: 0.6, transform: "scale(1)", filter: "none", offset: 0.4 },
            { opacity: 0.95, transform: "scale(1.5)", filter: "none", offset: 0.6 },
            { opacity: 0, transform: "scale(2.5)", filter: "none" },
          ];
        }

        const anim = vortexEl.animate(keyframes, {
          duration: 900,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          fill: "forwards",
        });
        anim.onfinish = () => {
          vortexEl.style.willChange = "auto";
        };
      }
    }, 80);

    // 100ms: Outgoing background leaves (zooms & blurs)
    setTimeout(() => {
      setPrevBgSrc(SCENE_BG[scene].src);
      setBgWarpState("leaving");
    }, 100);

    // 380ms: Card is invisible, update scene index and prepare new states
    setTimeout(() => {
      setHistory((h) => [...h, scene]);
      setScene(next);
      setCardState("entering");
      setBgWarpState("entering");
    }, 380);

    // 480ms: Incoming background sharpens in
    setTimeout(() => {
      setBgWarpState("on");
    }, 480);

    // 500ms: New card begins entrance animation
    setTimeout(() => {
      setCardState("entered");
    }, 500);

    // 980ms: Transition complete
    setTimeout(() => {
      setIsTransitioning(false);
    }, 980);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, isTransitioning, isMobile]);

  const goBack = useCallback(() => {
    if (isTransitioning || history.length === 0) return;
    setIsTransitioning(true);
    setIsBackTransition(true); // Enable clean reverse fade
    setSceneVisible(false);

    setTimeout(() => {
      const prev = history[history.length - 1]!;
      setHistory((h) => h.slice(0, -1));
      setScene(prev);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSceneVisible(true));
      });
      // Clear back state after fade is complete
      setTimeout(() => {
        setIsBackTransition(false);
        setIsTransitioning(false);
      }, 400);
    }, 400);
  }, [history, isTransitioning]);

  // ─── Auth handlers ────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    goTo("final");
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/notes`,
        data: { full_name: fullName, field_of_study: fieldOfStudy },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Could not create account", { description: error.message });
      return;
    }
    toast.success("Check your email to confirm your account");
    goTo("final");
  };

  // ─── Unique background images (deduplicated by src) ───────────────────────
  const uniqueBgs = [
    "/images/SL_073119_22070_26.jpg",
    "/images/5488909.jpg",
    "/images/6820263.jpg",
    "/images/12456.jpg",
  ];

  const currentBg = SCENE_BG[scene];
  const dotIndex = SCENE_DOT[scene];
  const stepLabel = SCENE_LABEL[scene];

  // ─── Dynamic Card Custom Offsets ──────────────────────────────────────────
  const distance = isMobile ? 30 : 60;
  const animConfig = CARD_ANIMATIONS[scene];
  const exitDir = animConfig ? animConfig[0] : null;
  const enterDir = animConfig ? animConfig[1] : "center";

  let cardStyleVariables = {} as React.CSSProperties;
  if (cardState === "exiting") {
    const dir = getExitDirection(exitDir, true);
    const offsets = getDirectionOffset(dir, distance);
    cardStyleVariables = {
      "--exit-x": `${offsets.x}px`,
      "--exit-y": `${offsets.y}px`,
    } as React.CSSProperties;
  } else if (cardState === "entering") {
    const offsets = getDirectionOffset(enterDir, distance);
    cardStyleVariables = {
      "--enter-x": `${offsets.x}px`,
      "--enter-y": `${offsets.y}px`,
    } as React.CSSProperties;
  }

  // ─── Shared styles ────────────────────────────────────────────────────────
  const cardStyle = {
    position: "absolute",
    background: "linear-gradient(135deg, rgba(12, 10, 8, 0.85) 0%, rgba(6, 5, 4, 0.90) 100%)",
    border: "1px solid rgba(201, 168, 76, 0.12)",
    borderLeft: "3px solid rgba(201, 168, 76, 0.7)",
    borderRadius: 0,
    padding: "40px 44px",
    width: 390,
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 30px rgba(201, 168, 76, 0.03)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 20,
    opacity: sceneVisible ? 1 : 0,
    transform: sceneVisible ? "translateY(0)" : "translateY(12px)",
    transition: isBackTransition ? "opacity 400ms ease" : "opacity 700ms ease, transform 700ms ease",
    "--y-offset": sceneVisible ? "0px" : "12px",
    ...cardStyleVariables,
    ...SCENE_POS[scene],
  } as React.CSSProperties;

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: "rgba(201, 168, 76, 0.5)",
    marginBottom: 8,
  };

  const questionStyle: React.CSSProperties = {
    fontSize: 18,
    fontFamily: "Georgia, serif",
    color: "#f0e8d8",
    marginBottom: 16,
    lineHeight: 1.4,
  };

  const subtextStyle: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(201,168,76,0.4)",
    marginTop: -10,
    marginBottom: 14,
  };

  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(201, 168, 76, 0.3)",
    borderRadius: 0,
    padding: "10px 4px",
    fontSize: 15,
    color: "#f0e8d8",
    width: "100%",
    outline: "none",
    letterSpacing: "0.03em",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box" as const,
  };

  const ctaStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid rgba(201, 168, 76, 0.5)",
    borderRadius: 6,
    color: "#c9a84c",
    padding: "11px 20px",
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    width: "100%",
    transition: "background 0.2s ease, border-color 0.2s ease",
    marginTop: 6,
  };

  const optionBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderLeft: "2px solid rgba(201, 168, 76, 0.25)",
    borderRadius: 0,
    color: "rgba(240, 232, 216, 0.6)",
    padding: "10px 16px",
    fontSize: 14,
    textAlign: "left" as const,
    width: "100%",
    cursor: "pointer",
    transition: "border-color 0.2s, color 0.2s, padding-left 0.2s",
    letterSpacing: "0.02em",
    marginBottom: 6,
  };

  // ─── Split tagline character details ──────────────────────────────────────
  const taglineText = "Engineering OS — Your AI-native study workspace";
  const splitTagline = useMemo(() => {
    let index = 0;
    return taglineText.split(" ").map((word) => {
      const chars = word.split("").map((char) => {
        const currentIdx = index;
        index++;
        return { char, index: currentIdx };
      });
      index++; // space
      return chars;
    });
  }, []);

  const cardAnimClass = isBackTransition
    ? ""
    : `card-anim ${cardState} ${scene === "final" ? "centered-card" : "mobile-centered-card"}`;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#060606",
        overflow: "hidden",
        transform: successZoom ? "scale(1.15)" : "scale(1)",
        transition: successZoom ? "transform 800ms ease" : "none",
      }}
    >
      <style>{`
        .auth-input::placeholder {
          color: rgba(240, 232, 216, 0.25);
          font-size: 13px;
          letter-spacing: 0.05em;
        }
        .auth-input:focus {
          border-bottom: 1px solid rgba(201, 168, 76, 0.85) !important;
        }
        .auth-cta:hover:not(:disabled) {
          background: rgba(201, 168, 76, 0.1) !important;
          border-color: rgba(201, 168, 76, 0.8) !important;
        }
        .auth-option:hover, .auth-option.selected {
          border-left-color: #c9a84c !important;
          color: #f0e8d8 !important;
          padding-left: 20px !important;
        }

        /* Transition Background Warps */
        .bg-layer {
          transition: opacity 1200ms ease, transform 900ms ease, filter 900ms ease;
        }
        .bg-layer.leaving {
          opacity: 0 !important;
          transform: scale(1.08) !important;
          filter: blur(12px) !important;
        }
        .bg-layer.entering {
          opacity: 0 !important;
          transform: scale(1.06) !important;
          filter: blur(8px) !important;
        }
        .bg-layer.entering.on {
          opacity: 1 !important;
          transform: scale(1) !important;
          filter: blur(0px) !important;
        }

        /* Transition Card Animations with Micro-bounce */
        .card-anim {
          transition: opacity 350ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .card-anim.exiting {
          opacity: 0 !important;
          transform: translate(var(--exit-x, 0px), var(--exit-y, 0px)) scale(0.95) !important;
        }
        .card-anim.entering {
          opacity: 0 !important;
          transform: translate(var(--enter-x, 0px), var(--enter-y, 0px)) scale(0.97) !important;
        }
        .card-anim.entered {
          opacity: 1 !important;
          transform: translate(0, 0) scale(1) !important;
        }

        /* Success & Centered Card overrides */
        .card-anim.centered-card.exiting {
          transform: translate(calc(-50% + var(--exit-x, 0px)), calc(-50% + var(--exit-y, 0px))) scale(0.95) !important;
        }
        .card-anim.centered-card.entering {
          transform: translate(calc(-50% + var(--enter-x, 0px)), calc(-50% + var(--enter-y, 0px))) scale(0.97) !important;
        }
        .card-anim.centered-card.entered {
          transform: translate(-50%, -50%) scale(1) !important;
        }

        /* Vortex gold radial energy portal overlay */
        .vortex-overlay {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          opacity: 0;
          transform: scale(0);
          background: radial-gradient(
            ellipse at var(--vx, 50%) var(--vy, 50%),
            rgba(201, 168, 76, 0.4) 0%,
            rgba(201, 168, 76, 0.15) 25%,
            rgba(10, 8, 6, 0.8) 55%,
            rgba(0, 0, 0, 0.95) 100%
          );
          transition: none;
        }

        /* Splash horizontal scanner sweep */
        .scanner-line {
          position: absolute;
          top: 50%;
          left: -100%;
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(201,168,76,0.0) 20%,
            rgba(201,168,76,0.6) 50%,
            rgba(201,168,76,0.0) 80%,
            transparent 100%
          );
          animation: scanLine 600ms ease-in-out forwards;
          z-index: 15;
        }
        @keyframes scanLine {
          0%   { left: -100%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }

        /* Mobile specific style centerings & performance adjustments */
        @media (max-width: 768px) {
          .auth-card {
            top: 50% !important;
            left: 50% !important;
            right: auto !important;
            bottom: auto !important;
            width: calc(100% - 48px) !important;
            max-width: 340px !important;
          }
          .mobile-centered-card.exiting {
            transform: translate(calc(-50% + var(--exit-x, 0px)), calc(-50% + var(--exit-y, 0px))) scale(0.95) !important;
          }
          .mobile-centered-card.entering {
            transform: translate(calc(-50% + var(--enter-x, 0px)), calc(-50% + var(--enter-y, 0px))) scale(0.97) !important;
          }
          .mobile-centered-card.entered {
            transform: translate(-50%, -50%) scale(1) !important;
          }
          .bg-layer {
            filter: none !important;
            transition: opacity 1200ms ease, transform 900ms ease !important;
          }
          .bg-layer.leaving {
            filter: none !important;
            transform: scale(1.08) !important;
          }
          .bg-layer.entering {
            filter: none !important;
            transform: scale(1.06) !important;
          }
          .bg-layer.entering.on {
            filter: none !important;
            transform: scale(1) !important;
          }
        }
      `}</style>

      {/* ── Background layers ────────────────────────────────────────────── */}
      {uniqueBgs.map((src) => {
        let bgClass = "bg-layer";
        let opacity = 0;

        if (src === currentBg.src) {
          if (bgWarpState === "entering") {
            bgClass += " entering";
          } else if (bgWarpState === "on" || bgWarpState === "none") {
            bgClass += " entering on";
            opacity = currentBg.opacity;
          }
        } else if (src === prevBgSrc && bgWarpState === "leaving") {
          bgClass += " leaving";
        }

        return (
          <div
            key={src}
            className={bgClass}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              opacity: bgVisible ? opacity : 0,
              transition: bgVisible ? undefined : "opacity 1400ms ease-in",
              pointerEvents: "none",
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              unoptimized
              style={{
                objectFit: "cover",
                objectPosition: currentBg.src === src ? currentBg.position : "center",
                transition: "object-position 1200ms ease",
              }}
            />
          </div>
        );
      })}

      {/* ── Final scene radial glow bg ───────────────────────────────────── */}
      {scene === "final" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.08) 0%, transparent 60%)",
            opacity: sceneVisible ? 1 : 0,
            transition: "opacity 700ms ease",
          }}
        />
      )}

      {/* ── Particle canvas ──────────────────────────────────────────────── */}
      {canvasVisible && <ParticleCanvas />}

      {/* ── Vortex radial gold energy portal overlay ─────────────────────── */}
      <div ref={vortexRef} className="vortex-overlay" />

      {/* ── Horizontal Gold Scanner Sweeper ──────────────────────────────── */}
      {scannerActive && <div className="scanner-line" />}

      {/* ── Back button ───────────────────────────────────────────────────── */}
      {scene !== "splash" && scene !== "final" && (
        <button
          onClick={goBack}
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            zIndex: 30,
            background: "rgba(6, 5, 4, 0.4)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(201,168,76,0.15)",
            borderRadius: "6px",
            color: "#c9a84c",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 500,
            opacity: sceneVisible ? 1 : 0,
            transition: "opacity 400ms ease, background 200ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6, 5, 4, 0.7)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(6, 5, 4, 0.4)")}
        >
          <ArrowLeft size={14} />
          Back
        </button>
      )}

      {/* ── Step label (top-right) ───────────────────────────────────────── */}
      {stepLabel && (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            zIndex: 30,
            background: "rgba(6, 5, 4, 0.4)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(201,168,76,0.15)",
            borderRadius: "6px",
            padding: "6px 12px",
            fontSize: 10,
            color: "rgba(201,168,76,0.8)",
            letterSpacing: "0.1em",
            opacity: sceneVisible ? 1 : 0,
            transition: "opacity 400ms ease",
          }}
        >
          {stepLabel}
        </div>
      )}

      {/* ── Progress dots ────────────────────────────────────────────────── */}
      {dotIndex >= 0 && <ProgressDots active={dotIndex} total={8} />}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 0 — Splash
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "splash" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            src="/images/logo-transparent.png"
            alt="Cortex"
            width={220}
            height={60}
            unoptimized
            style={{
              opacity: logoVisible ? 1 : 0,
              transform: logoVisible ? "scale(1)" : "scale(0.8)",
              transition: "opacity 800ms ease, transform 800ms ease",
            }}
          />
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 15,
              color: "rgba(201,168,76,0.55)",
              marginTop: 16,
              letterSpacing: "0.04em",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
              {splitTagline.map((wordChars, wIdx) => (
                <span key={wIdx} style={{ display: "inline-flex", marginRight: "0.3em" }}>
                  {wordChars.map(({ char, index }) => (
                    <span
                      key={index}
                      style={{
                        opacity: taglineVisible ? 1 : 0,
                        transform: taglineVisible ? "translateY(0)" : "translateY(8px)",
                        transition: "opacity 400ms ease, transform 400ms ease",
                        transitionDelay: `${index * 40}ms`,
                        display: "inline-block",
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 1 — Welcome
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "welcome" && (
        <div style={cardStyle} className={classNameForCard(cardAnimClass)}>
          <CardCorners />
          <div style={labelStyle}>WELCOME</div>
          <div style={questionStyle}>Have you used Cortex before?</div>
          <button
            style={optionBtnStyle}
            className="auth-option"
            onClick={() => goTo("signin-email")}
          >
            Yes — sign me in
          </button>
          <button
            style={optionBtnStyle}
            className="auth-option"
            onClick={() => goTo("signup-name")}
          >
            No — I&apos;m new here
          </button>
          <CardFooter />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 2A — Sign in: Email
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signin-email" && (
        <div style={cardStyle} className={classNameForCard(cardAnimClass)}>
          <CardCorners />
          <div style={labelStyle}>{SCENE_LABEL["signin-email"]}</div>
          <div style={questionStyle}>What&apos;s your email?</div>
          <input
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            className="auth-input"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && email && goTo("signin-password")}
          />
          <button
            style={{ ...ctaStyle, opacity: email ? 1 : 0.5 }}
            className="auth-cta"
            disabled={!email}
            onClick={() => goTo("signin-password")}
          >
            Continue →
          </button>
          <CardFooter />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 3A — Sign in: Password
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signin-password" && (
        <div style={cardStyle} className={classNameForCard(cardAnimClass)}>
          <CardCorners />
          <div style={labelStyle}>{SCENE_LABEL["signin-password"]}</div>
          <div style={questionStyle}>And your password?</div>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 38 }}
              className="auth-input"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && password && handleSignIn()}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(201,168,76,0.4)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={{ textAlign: "right", marginBottom: 10 }}>
            <span
              style={{ fontSize: 11, color: "rgba(201,168,76,0.35)", cursor: "pointer" }}
              onClick={() => router.push("/auth/reset-password")}
            >
              Forgot password?
            </span>
          </div>
          <button
            style={{ ...ctaStyle, opacity: password ? 1 : 0.5 }}
            className="auth-cta"
            disabled={!password || loading}
            onClick={handleSignIn}
          >
            {loading ? "Signing in..." : "Enter Cortex →"}
          </button>
          <CardFooter />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 2B — Signup: Name
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-name" && (
        <div style={cardStyle} className={classNameForCard(cardAnimClass)}>
          <CardCorners />
          <div style={labelStyle}>{SCENE_LABEL["signup-name"]}</div>
          <div style={questionStyle}>What should we call you?</div>
          <div style={subtextStyle}>This is how you&apos;ll appear in your workspace.</div>
          <input
            type="text"
            placeholder="e.g. Arjun Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
            className="auth-input"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && fullName && goTo("signup-email")}
          />
          <button
            style={{ ...ctaStyle, opacity: fullName ? 1 : 0.5 }}
            className="auth-cta"
            disabled={!fullName}
            onClick={() => goTo("signup-email")}
          >
            Continue →
          </button>
          <CardFooter />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 3B — Signup: Email
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-email" && (
        <div style={cardStyle} className={classNameForCard(cardAnimClass)}>
          <CardCorners />
          <div style={labelStyle}>{SCENE_LABEL["signup-email"]}</div>
          <div style={questionStyle}>What&apos;s your email address?</div>
          <input
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            className="auth-input"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && email && goTo("signup-field")}
          />
          <button
            style={{ ...ctaStyle, opacity: email ? 1 : 0.5 }}
            className="auth-cta"
            disabled={!email}
            onClick={() => goTo("signup-field")}
          >
            Continue →
          </button>
          <CardFooter />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 4B — Signup: Field of study
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-field" && (
        <div style={cardStyle} className={classNameForCard(cardAnimClass)}>
          <CardCorners />
          <div style={labelStyle}>{SCENE_LABEL["signup-field"]}</div>
          <div style={questionStyle}>What are you studying?</div>
          <div style={subtextStyle}>We&apos;ll personalize your workspace.</div>
          {["Computer Science / AI", "Electronics / ECE", "Mechanical / Civil", "Mathematics / Physics"].map(
            (field) => (
              <button
                key={field}
                className={`auth-option ${fieldOfStudy === field ? "selected" : ""}`}
                style={optionBtnStyle}
                onClick={() => {
                  setFieldOfStudy(field);
                  setTimeout(() => goTo("signup-password"), 300);
                }}
              >
                {field}
              </button>
            )
          )}
          <CardFooter />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 5B — Signup: Password
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-password" && (
        <div style={cardStyle} className={classNameForCard(cardAnimClass)}>
          <CardCorners />
          <div style={labelStyle}>{SCENE_LABEL["signup-password"]}</div>
          <div style={questionStyle}>Set a strong password.</div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 38 }}
              className="auth-input"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(201,168,76,0.4)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <input
              type={showConfirmPw ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 38 }}
              className="auth-input"
              onKeyDown={(e) => e.key === "Enter" && password && confirmPassword && handleSignUp()}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(201,168,76,0.4)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button
            style={{ ...ctaStyle, opacity: password && confirmPassword ? 1 : 0.5 }}
            className="auth-cta"
            disabled={!password || !confirmPassword || loading}
            onClick={handleSignUp}
          >
            {loading ? "Creating..." : "Create my workspace →"}
          </button>
          <CardFooter />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE FINAL — Success
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "final" && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            width: 320,
          }}
          className={classNameForCard(cardAnimClass)}
        >
          <CardCorners />
          <AnimatedCheckmark />
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 22,
              color: "#f0e8d8",
              marginBottom: 8,
              opacity: successTitleVisible ? 1 : 0,
              transition: "opacity 400ms ease",
            }}
          >
            You&apos;re in.
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(201,168,76,0.35)",
              opacity: successSubVisible ? 1 : 0,
              transition: "opacity 400ms ease",
            }}
          >
            Taking you to your workspace...
          </div>
        </div>
      )}

      {/* ── Blackout overlay on Success ──────────────────────────────────── */}
      {successBlackout && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            zIndex: 9999,
            pointerEvents: "all",
          }}
        />
      )}
    </div>
  );
}

// ─── Class name helper ──────────────────────────────────────────────────────
function classNameForCard(animClass: string) {
  return `auth-card ${animClass}`;
}

// ─── Technical Card HUD details ──────────────────────────────────────────────
function CardCorners() {
  const cornerStyle = {
    position: "absolute" as const,
    width: 8,
    height: 8,
    borderColor: "rgba(201, 168, 76, 0.4)",
    borderStyle: "solid",
    pointerEvents: "none" as const,
  };
  return (
    <>
      <div style={{ ...cornerStyle, top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 }} />
      <div style={{ ...cornerStyle, top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 }} />
      <div style={{ ...cornerStyle, bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 }} />
      <div style={{ ...cornerStyle, bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 }} />
    </>
  );
}

function CardFooter() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 24,
        opacity: 0.35,
        fontSize: 8,
        fontFamily: "monospace, Courier, monospace",
        letterSpacing: "0.12em",
        color: "rgba(201, 168, 76, 0.95)",
        textTransform: "uppercase" as const,
        borderTop: "1px dashed rgba(201, 168, 76, 0.15)",
        paddingTop: 12,
        pointerEvents: "none" as const,
      }}
    >
      <span>CORTEX // SECURE_AUTH</span>
      <span>SYS_V1.0.5</span>
    </div>
  );
}
