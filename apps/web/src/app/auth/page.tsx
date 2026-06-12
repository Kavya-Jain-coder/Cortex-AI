"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
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
  welcome:          { bottom: 64, left: 56 },
  "signin-email":   { top: 52, right: 56 },
  "signin-password":{ bottom: 64, right: 56 },
  "signup-name":    { top: 52, left: 56 },
  "signup-email":   { bottom: 64, left: 56 },
  "signup-field":   { top: 52, right: 56 },
  "signup-password":{ bottom: 64, right: 56 },
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
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const NODE_COUNT = 60;
    const MAX_DIST = 110;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
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
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas!.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas!.height) n.vy *= -1;
      }

      // Draw lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.15;
            ctx!.strokeStyle = `rgba(201,168,76,${alpha})`;
            ctx!.lineWidth = 0.5;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx!.fillStyle = "rgba(201,168,76,0.5)";
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
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

  // ─── Splash auto-advance ─────────────────────────────────────────────────
  const [splashLogo, setSplashLogo] = useState(false);
  const [splashTagline, setSplashTagline] = useState(false);

  useEffect(() => {
    if (scene !== "splash") return;
    const t1 = setTimeout(() => setSplashLogo(true), 200);
    const t2 = setTimeout(() => setSplashTagline(true), 700);
    const t3 = setTimeout(() => goTo("welcome"), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // ─── Final auto-redirect ─────────────────────────────────────────────────
  useEffect(() => {
    if (scene !== "final") return;
    const t = setTimeout(() => router.push("/notes"), 1800);
    return () => clearTimeout(t);
  }, [scene, router]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const goTo = useCallback((next: SceneId) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSceneVisible(false); // fade out current

    setTimeout(() => {
      setHistory((h) => [...h, scene]);
      setScene(next);
      // Small delay then fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSceneVisible(true));
      });
      setIsTransitioning(false);
    }, 350);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, isTransitioning]);

  const goBack = useCallback(() => {
    if (isTransitioning || history.length === 0) return;
    setIsTransitioning(true);
    setSceneVisible(false);

    setTimeout(() => {
      const prev = history[history.length - 1]!;
      setHistory((h) => h.slice(0, -1));
      setScene(prev);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSceneVisible(true));
      });
      setIsTransitioning(false);
    }, 350);
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

  // ─── Shared styles ────────────────────────────────────────────────────────
  const cardStyle = {
    position: "absolute",
    background: "rgba(4, 3, 2, 0.75)",
    border: "none",
    borderLeft: "1px solid rgba(201, 168, 76, 0.2)",
    borderRadius: 0,
    padding: "32px 36px",
    width: 290,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    zIndex: 20,
    opacity: sceneVisible ? 1 : 0,
    transform: sceneVisible ? "translateY(0)" : "translateY(12px)",
    transition: "opacity 700ms ease, transform 700ms ease",
    "--y-offset": sceneVisible ? "0px" : "12px",
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "#060606", overflow: "hidden" }}>
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
        @media (max-width: 768px) {
          .auth-card {
            top: 50% !important;
            left: 50% !important;
            right: auto !important;
            bottom: auto !important;
            width: calc(100% - 48px) !important;
            max-width: 340px !important;
            transform: translate(-50%, calc(-50% + var(--y-offset, 0px))) !important;
          }
        }
      `}</style>
      {/* ── Background layers ────────────────────────────────────────────── */}
      {uniqueBgs.map((src) => (
        <div
          key={src}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: currentBg.src === src ? currentBg.opacity : 0,
            transition: "opacity 1200ms ease",
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
      ))}

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
      <ParticleCanvas />

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
              opacity: splashLogo ? 1 : 0,
              transform: splashLogo ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 800ms ease, transform 800ms ease",
            }}
          />
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 15,
              color: "rgba(201,168,76,0.55)",
              marginTop: 16,
              letterSpacing: "0.04em",
              opacity: splashTagline ? 1 : 0,
              transform: splashTagline ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 700ms ease, transform 700ms ease",
            }}
          >
            Engineering OS — Your AI-native study workspace
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 1 — Welcome
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "welcome" && (
        <div style={cardStyle} className="auth-card">
          <div style={labelStyle}>WELCOME</div>
          <div style={questionStyle}>Have you used Cortex before?</div>
          <button
            style={optionBtnStyle} className="auth-option"

            onClick={() => goTo("signin-email")}
          >
            Yes — sign me in
          </button>
          <button
            style={optionBtnStyle} className="auth-option"

            onClick={() => goTo("signup-name")}
          >
            No — I&apos;m new here
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 2A — Sign in: Email
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signin-email" && (
        <div style={cardStyle} className="auth-card">
          <div style={labelStyle}>{SCENE_LABEL["signin-email"]}</div>
          <div style={questionStyle}>What&apos;s your email?</div>
          <input
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle} className="auth-input"
            
            
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && email && goTo("signin-password")}
          />
          <button
            style={{ ...ctaStyle, opacity: email ? 1 : 0.5 }} className="auth-cta"
            disabled={!email}
            onClick={() => goTo("signin-password")}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 3A — Sign in: Password
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signin-password" && (
        <div style={cardStyle} className="auth-card">
          <div style={labelStyle}>{SCENE_LABEL["signin-password"]}</div>
          <div style={questionStyle}>And your password?</div>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 38 }} className="auth-input"
              
              
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
            style={{ ...ctaStyle, opacity: password ? 1 : 0.5 }} className="auth-cta"
            disabled={!password || loading}
            onClick={handleSignIn}
          >
            {loading ? "Signing in..." : "Enter Cortex →"}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 2B — Signup: Name
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-name" && (
        <div style={cardStyle} className="auth-card">
          <div style={labelStyle}>{SCENE_LABEL["signup-name"]}</div>
          <div style={questionStyle}>What should we call you?</div>
          <div style={subtextStyle}>This is how you&apos;ll appear in your workspace.</div>
          <input
            type="text"
            placeholder="e.g. Arjun Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle} className="auth-input"
            
            
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && fullName && goTo("signup-email")}
          />
          <button
            style={{ ...ctaStyle, opacity: fullName ? 1 : 0.5 }} className="auth-cta"
            disabled={!fullName}
            onClick={() => goTo("signup-email")}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 3B — Signup: Email
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-email" && (
        <div style={cardStyle} className="auth-card">
          <div style={labelStyle}>{SCENE_LABEL["signup-email"]}</div>
          <div style={questionStyle}>What&apos;s your email address?</div>
          <input
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle} className="auth-input"
            
            
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && email && goTo("signup-field")}
          />
          <button
            style={{ ...ctaStyle, opacity: email ? 1 : 0.5 }} className="auth-cta"
            disabled={!email}
            onClick={() => goTo("signup-field")}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 4B — Signup: Field of study
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-field" && (
        <div style={cardStyle} className="auth-card">
          <div style={labelStyle}>{SCENE_LABEL["signup-field"]}</div>
          <div style={questionStyle}>What are you studying?</div>
          <div style={subtextStyle}>We&apos;ll personalize your workspace.</div>
          {["Computer Science / AI", "Electronics / ECE", "Mechanical / Civil", "Mathematics / Physics"].map(
            (field) => (
              <button
                key={field}
                style={optionBtnStyle}
                className={`auth-option ${fieldOfStudy === field ? "selected" : ""}`}

                onClick={() => {
                  setFieldOfStudy(field);
                  setTimeout(() => goTo("signup-password"), 300);
                }}
              >
                {field}
              </button>
            )
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SCENE 5B — Signup: Password
      ════════════════════════════════════════════════════════════════════ */}
      {scene === "signup-password" && (
        <div style={cardStyle} className="auth-card">
          <div style={labelStyle}>{SCENE_LABEL["signup-password"]}</div>
          <div style={questionStyle}>Set a strong password.</div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 38 }} className="auth-input"
              
              
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
              style={{ ...inputStyle, paddingRight: 38 }} className="auth-input"
              
              
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
            disabled={!password || !confirmPassword || loading}
            onClick={handleSignUp}
          >
            {loading ? "Creating..." : "Create my workspace →"}
          </button>
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
            width: 260,
          }}
        >
          <AnimatedCheckmark />
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 22,
              color: "#f0e8d8",
              marginBottom: 8,
            }}
          >
            You&apos;re in.
          </div>
          <div style={{ fontSize: 12, color: "rgba(201,168,76,0.35)" }}>
            Taking you to your workspace...
          </div>
        </div>
      )}
    </div>
  );
}
