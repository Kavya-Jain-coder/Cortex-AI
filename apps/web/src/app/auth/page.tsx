"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { Eye, EyeOff, ArrowLeft, Volume2, VolumeX, Shield, Swords, Gamepad2, Award, Zap, User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────
type SceneId =
  | "splash"
  | "welcome"
  | "signin-email"
  | "signin-password"
  | "signup-name"
  | "signup-email"
  | "signup-password"
  | "signup-field"
  | "final";

interface BgConfig {
  src: string;
  position: string;
  opacity: number;
}

// ─── Scene → Background mapping ─────────────────────────────────────────────
const SCENE_BG: Record<SceneId, BgConfig> = {
  splash:            { src: "/images/hero-tunnel.jpg",     position: "center",        opacity: 0.90 },
  welcome:           { src: "/images/dashboard-bg.jpg",    position: "center",        opacity: 0.90 },
  "signin-email":    { src: "/images/lol-bg.jpg",          position: "center",        opacity: 0.85 },
  "signin-password": { src: "/images/cs2-bg.jpg",          position: "center",        opacity: 0.85 },
  "signup-name":     { src: "/images/valorant-bg.jpg",     position: "center",        opacity: 0.85 },
  "signup-email":    { src: "/images/cs2-bg.jpg",          position: "center",        opacity: 0.85 },
  "signup-password": { src: "/images/lol-bg.jpg",          position: "center",        opacity: 0.85 },
  "signup-field":    { src: "/images/pubg-bg.jpg",         position: "center",        opacity: 0.85 },
  final:             { src: "/images/hero-tunnel.jpg",     position: "center",        opacity: 0.95 },
};

// ─── Scene → Progress Indicator index (1-based, 0 = hidden) ─────────────────
const SCENE_STEP_INDEX: Record<SceneId, number> = {
  splash: 0,
  welcome: 0,
  "signin-email": 1,
  "signin-password": 2,
  "signup-name": 1,
  "signup-email": 2,
  "signup-password": 3,
  "signup-field": 4,
  final: 0,
};

const TOTAL_STEPS = 4;

export default function AuthPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // ─── Scene state ──────────────────────────────────────────────────────────
  const [scene, setScene] = useState<SceneId>("splash");
  const [history, setHistory] = useState<SceneId[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [swipeTransition, setSwipeTransition] = useState(false);

  // ─── Form state ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState(""); // Stores selected primary game
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Terminal Typewriter states (Step 2) ──────────────────────────────────
  const [terminalText1, setTerminalText1] = useState("");
  const [terminalText2, setTerminalText2] = useState("");

  // ─── Audio state & refs ───────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Detect Screen Size ──────────────────────────────────────────────────
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Background Music Player ──────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio("/background_music/vasilyatsevich-brain-implant-cyberpunk-sci-fi-trailer-action-intro-330416.mp3");
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;

    const startPlay = async () => {
      try {
        await audio.play();
      } catch (err) {
        console.log("Autoplay blocked, waiting for user interaction");
      }
    };
    startPlay();

    const handleInteraction = async () => {
      if (audio.paused) {
        try {
          await audio.play();
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("keydown", handleInteraction);
        } catch (e) {
          // blocked
        }
      }
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("keydown", handleInteraction);

    return () => {
      audio.pause();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // Sync mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Audio smooth fade-out on final auth success
  useEffect(() => {
    if (scene === "final" && audioRef.current) {
      const audio = audioRef.current;
      let vol = audio.volume;
      const interval = setInterval(() => {
        if (vol > 0.05) {
          vol -= 0.05;
          audio.volume = vol;
        } else {
          audio.pause();
          clearInterval(interval);
        }
      }, 60);
      return () => clearInterval(interval);
    }
  }, [scene]);

  // ─── Step 1 Portal transition sequence ────────────────────────────────────
  useEffect(() => {
    if (scene !== "splash") return;

    // Transition to welcome gate after 2.8s
    const swipeTimer = setTimeout(() => {
      setSwipeTransition(true);
    }, 2400);

    const advanceTimer = setTimeout(() => {
      goTo("welcome");
      setSwipeTransition(false);
    }, 2800);

    return () => {
      clearTimeout(swipeTimer);
      clearTimeout(advanceTimer);
    };
  }, [scene]);

  // ─── Step 2 Gate Terminal Typing effect ───────────────────────────────────
  useEffect(() => {
    if (scene !== "welcome") {
      setTerminalText1("");
      setTerminalText2("");
      return;
    }

    let isMounted = true;
    const phrase1 = "AGENT DETECTED.";
    const phrase2 = "HAVE WE MET BEFORE?";

    const typePhrase1 = async () => {
      for (let i = 0; i <= phrase1.length; i++) {
        if (!isMounted) return;
        setTerminalText1(phrase1.slice(0, i));
        await new Promise((r) => setTimeout(r, 60));
      }
      await new Promise((r) => setTimeout(r, 600)); // Pause 0.6s
      for (let i = 0; i <= phrase2.length; i++) {
        if (!isMounted) return;
        setTerminalText2(phrase2.slice(0, i));
        await new Promise((r) => setTimeout(r, 60));
      }
    };

    typePhrase1();

    return () => {
      isMounted = false;
    };
  }, [scene]);

  // ─── Final Success transition sequence ────────────────────────────────────
  useEffect(() => {
    if (scene !== "final") return;

    const redirectTimer = setTimeout(() => {
      router.push("/notes");
    }, 3800);

    return () => clearTimeout(redirectTimer);
  }, [scene, router]);

  // ─── Navigation helpers ───────────────────────────────────────────────────
  const goTo = useCallback((next: SceneId) => {
    setHistory((prev) => [...prev, scene]);
    setScene(next);
  }, [scene]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    setHistory((h) => h.slice(0, -1));
    setScene(prev);
  }, [history]);

  // ─── Sign In / Sign Up handler logic ──────────────────────────────────────
  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Access Denied", { description: error.message });
      return;
    }
    goTo("final");
  };

  const handleSignUp = async (selectedGame: string) => {
    setLoading(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/notes`,
        data: { full_name: fullName, field_of_study: selectedGame },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Registration Failed", { description: error.message });
      return;
    }
    toast.success("Identity profile initialized. Check verification link.");
    goTo("final");
  };

  // Determine current active step dots
  const activeStep = SCENE_STEP_INDEX[scene];

  return (
    <main className="fixed inset-0 bg-[#030303] text-[#f5f5f7] font-sans overflow-hidden select-none">
      {/* ── Background Image Layer (Cross-fading with Vignette) ──────────────── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={scene}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: SCENE_BG[scene].opacity, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 pointer-events-none"
          >
            <Image
              src={SCENE_BG[scene].src}
              alt=""
              fill
              priority
              unoptimized
              className="object-cover transition-transform duration-[4000ms]"
              style={{ objectPosition: SCENE_BG[scene].position }}
            />
          </motion.div>
        </AnimatePresence>
        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/85 z-10 pointer-events-none" />
      </div>

      {/* ── Sound Design Controllers ─────────────────────────────────────────── */}
      {scene !== "splash" && scene !== "final" && (
        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={() => setIsMuted((m) => !m)}
            data-sound="hover-click"
            className="w-10 h-10 rounded-full border border-gold-glow/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-gold-glow hover:border-gold-glow/60 hover:scale-105 transition-all duration-300"
            title={isMuted ? "Unmute system core audio" : "Mute system core audio"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      )}

      {/* ── Back Navigation Control ──────────────────────────────────────────── */}
      {scene !== "splash" && scene !== "welcome" && scene !== "final" && (
        <button
          onClick={goBack}
          data-sound="hover-back"
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 border border-white/10 bg-black/40 backdrop-blur-md rounded-md text-sm text-zinc-400 hover:text-white hover:border-white/30 transition-all duration-300"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      )}

      {/* ── Top-Center Progress Dot Indicators ───────────────────────────────── */}
      {activeStep > 0 && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-[4px] rounded-full transition-all duration-500 ${
                i + 1 === activeStep
                  ? scene.startsWith("signup")
                    ? "w-8 bg-pink-500 shadow-[0_0_10px_#ec4899]"
                    : "w-8 bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                  : i + 1 < activeStep
                  ? "w-2 bg-emerald-500"
                  : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Cinematic Portal Transitions (Swipe Effect) ─────────────────────── */}
      <AnimatePresence>
        {swipeTransition && (
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            exit={{ left: "100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent blur-2xl z-[9999]"
            style={{ width: "200%" }}
          />
        )}
      </AnimatePresence>

      {/* ── Scene Components Renderer ────────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: PORTAL SPLASH */}
          {scene === "splash" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center"
            >
              {/* Fade in central logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
                className="relative flex flex-col items-center"
              >
                {/* Neon logo text */}
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 animate-pulse drop-shadow-[0_0_25px_rgba(245,158,11,0.45)] uppercase font-mono">
                  NEXUS.GG
                </h1>
                
                {/* Subtitle letter-by-letter fade */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                  className="mt-6 font-mono text-xs md:text-sm tracking-[0.4em] text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] uppercase"
                >
                  YOUR COACHING OPERATING SYSTEM
                </motion.div>
              </motion.div>

              {/* Particle Blast Canvas Background Accent */}
              <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="portal-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#eab308" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="50%" cy="50%" r="35%" fill="url(#portal-glow)" />
                </svg>
              </div>
            </motion.div>
          )}

          {/* STEP 2: THE WELCOME GATE */}
          {scene === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col justify-end md:justify-end items-end p-8 md:p-16 z-30"
            >
              {/* Question Text Terminal Style */}
              <div className="w-full max-w-lg md:mr-12 mb-8 text-right font-mono">
                <div className="text-zinc-500 text-sm tracking-wider uppercase mb-1">
                  [ SYSTEM DIAGNOSTIC ]
                </div>
                <div className="text-emerald-400 text-xl md:text-2xl font-bold tracking-widest min-h-[30px]">
                  {terminalText1}
                  <span className="animate-ping">_</span>
                </div>
                <div className="text-zinc-300 text-lg md:text-xl tracking-wider mt-2 font-bold min-h-[30px]">
                  {terminalText2}
                </div>
              </div>

              {/* Staggered Glassmorphic Choice Cards */}
              <div className="flex flex-col md:flex-row gap-6 md:mr-12 w-full max-w-lg">
                {/* Left Card: New Recruit */}
                <motion.button
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  onClick={() => goTo("signup-name")}
                  data-sound="hover-card-cyan"
                  className="flex-1 p-6 bg-black/55 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/80 rounded-none text-left transition-all duration-300 group hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] flex flex-col justify-between min-h-[140px] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-[2px] h-full bg-cyan-500" />
                  <div className="text-cyan-400 text-xs font-bold tracking-widest font-mono uppercase mb-4">
                    // CLASS_NEW
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold tracking-wide uppercase group-hover:text-cyan-300 transition-colors">
                      NEW RECRUIT
                    </h3>
                    <p className="text-zinc-400 text-xs mt-1">
                      Initialize training profile & access game coaching utilities.
                    </p>
                  </div>
                </motion.button>

                {/* Right Card: Returning Agent */}
                <motion.button
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  onClick={() => goTo("signin-email")}
                  data-sound="hover-card-gold"
                  className="flex-1 p-6 bg-black/55 backdrop-blur-xl border border-amber-500/20 hover:border-amber-400/80 rounded-none text-left transition-all duration-300 group hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col justify-between min-h-[140px] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-[2px] h-full bg-amber-500" />
                  <div className="text-amber-400 text-xs font-bold tracking-widest font-mono uppercase mb-4">
                    // SYSTEM_VERIFIED
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold tracking-wide uppercase group-hover:text-amber-300 transition-colors">
                      RETURNING AGENT
                    </h3>
                    <p className="text-zinc-400 text-xs mt-1">
                      Establish secure uplink with saved coach analytics datasets.
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* SIGNUP QUESTION 1: CALLSIGN */}
          {scene === "signup-name" && (
            <motion.div
              key="signup-name"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", stiffness: 90, damping: 15 }}
              className="absolute left-6 md:left-[10%] top-[35%] md:top-[40%] w-full max-w-md p-8 md:p-10 bg-black/60 backdrop-blur-xl border border-pink-500/20 shadow-[0_0_30px_rgba(236,72,153,0.05)] relative"
            >
              {/* Gold Top Accent Line */}
              <div className="absolute top-0 left-0 w-[30px] h-[3px] bg-pink-500" />
              <div className="absolute top-0 left-0 w-[3px] h-[30px] bg-pink-500" />
              <div className="absolute bottom-0 right-0 w-[30px] h-[3px] bg-pink-500" />
              <div className="absolute bottom-0 right-0 w-[3px] h-[30px] bg-pink-500" />

              <div className="font-mono text-pink-500 text-[10px] tracking-widest uppercase mb-2">
                CREATE IDENTITY // PHASE_01
              </div>
              <h2 className="text-2xl font-bold tracking-wide uppercase mb-3 font-mono text-zinc-100 flex items-center gap-2">
                <User size={18} className="text-pink-500" />
                CHOOSE YOUR CALLSIGN
              </h2>
              <p className="text-zinc-400 text-xs mb-6">
                Define the name that will represent you across coach checklists.
              </p>

              <div className="relative group">
                <input
                  type="text"
                  placeholder="e.g. VORTEX_AGENT"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent border-b border-pink-500/30 text-white py-3 px-1 outline-none text-base placeholder-zinc-700 focus:border-pink-500 transition-all duration-300 font-mono tracking-widest"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && fullName && goTo("signup-email")}
                />
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  disabled={!fullName}
                  onClick={() => goTo("signup-email")}
                  data-sound="click-next"
                  className="px-6 py-2 border border-pink-500/50 hover:border-pink-400 hover:bg-pink-500/10 text-pink-400 rounded-none text-xs font-mono uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  NEXT PROFILE UPLINK →
                </button>
              </div>
            </motion.div>
          )}

          {/* SIGNUP QUESTION 2: EMAIL */}
          {scene === "signup-email" && (
            <motion.div
              key="signup-email"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="absolute bottom-8 md:bottom-[10%] left-1/2 -translate-x-1/2 w-full max-w-md p-8 md:p-10 bg-black/60 backdrop-blur-xl border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.05)] relative"
            >
              <div className="absolute top-0 left-0 w-[30px] h-[3px] bg-cyan-500" />
              <div className="absolute top-0 left-0 w-[3px] h-[30px] bg-cyan-500" />
              <div className="absolute bottom-0 right-0 w-[30px] h-[3px] bg-cyan-500" />
              <div className="absolute bottom-0 right-0 w-[3px] h-[30px] bg-cyan-500" />

              <div className="font-mono text-cyan-400 text-[10px] tracking-widest uppercase mb-2">
                IDENTITY PROFILE // PHASE_02
              </div>
              <h2 className="text-2xl font-bold tracking-wide uppercase mb-3 font-mono text-zinc-100 flex items-center gap-2">
                <Mail size={18} className="text-cyan-400" />
                DROP YOUR EMAIL, AGENT
              </h2>
              <p className="text-zinc-400 text-xs mb-6">
                Needed for encryption checks and notifications access.
              </p>

              <input
                type="email"
                placeholder="agent@nexus.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-cyan-500/30 text-white py-3 px-1 outline-none text-base placeholder-zinc-700 focus:border-cyan-500 transition-all duration-300 font-mono tracking-widest"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && email && goTo("signup-password")}
              />

              <div className="mt-8 flex justify-end">
                <button
                  disabled={!email}
                  onClick={() => goTo("signup-password")}
                  data-sound="click-next"
                  className="px-6 py-2 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400 rounded-none text-xs font-mono uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  NEXT PROFILE UPLINK →
                </button>
              </div>
            </motion.div>
          )}

          {/* SIGNUP QUESTION 3: PASSWORD */}
          {scene === "signup-password" && (
            <motion.div
              key="signup-password"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="absolute right-6 md:right-[10%] top-[45%] md:top-[50%] -translate-y-1/2 w-full max-w-md p-8 md:p-10 bg-black/60 backdrop-blur-xl border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] relative"
            >
              <div className="absolute top-0 left-0 w-[30px] h-[3px] bg-amber-500" />
              <div className="absolute top-0 left-0 w-[3px] h-[30px] bg-amber-500" />
              <div className="absolute bottom-0 right-0 w-[30px] h-[3px] bg-amber-500" />
              <div className="absolute bottom-0 right-0 w-[3px] h-[30px] bg-amber-500" />

              <div className="font-mono text-amber-500 text-[10px] tracking-widest uppercase mb-2">
                PROFILE SECURITY // PHASE_03
              </div>
              <h2 className="text-2xl font-bold tracking-wide uppercase mb-3 font-mono text-zinc-100 flex items-center gap-2">
                <Lock size={18} className="text-amber-500" />
                SET YOUR ENCRYPTION KEY
              </h2>
              <p className="text-zinc-400 text-xs mb-6">
                Ensure access authorization remains safe.
              </p>

              <div className="relative mb-6">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Cipher (Min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-amber-500/30 text-white py-3 px-1 pr-10 outline-none text-base placeholder-zinc-700 focus:border-amber-500 transition-all duration-300 font-mono tracking-widest"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-4 text-amber-500/40 hover:text-amber-500"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Confirm Cipher"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-amber-500/30 text-white py-3 px-1 pr-10 outline-none text-base placeholder-zinc-700 focus:border-amber-500 transition-all duration-300 font-mono tracking-widest"
                  onKeyDown={(e) => e.key === "Enter" && password && confirmPassword && goTo("signup-field")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-2 top-4 text-amber-500/40 hover:text-amber-500"
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  disabled={!password || password.length < 6 || password !== confirmPassword}
                  onClick={() => goTo("signup-field")}
                  data-sound="click-next"
                  className="px-6 py-2 border border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/10 text-amber-400 rounded-none text-xs font-mono uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  NEXT PROFILE UPLINK →
                </button>
              </div>
            </motion.div>
          )}

          {/* SIGNUP QUESTION 4: BATTLEFIELD SELECTION */}
          {scene === "signup-field" && (
            <motion.div
              key="signup-field"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-[18%] left-1/2 -translate-x-1/2 w-full max-w-4xl p-8 md:p-10 bg-black/65 backdrop-blur-xl border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)] relative"
            >
              <div className="absolute top-0 left-0 w-[30px] h-[3px] bg-red-500" />
              <div className="absolute top-0 left-0 w-[3px] h-[30px] bg-red-500" />
              <div className="absolute bottom-0 right-0 w-[30px] h-[3px] bg-red-500" />
              <div className="absolute bottom-0 right-0 w-[3px] h-[30px] bg-red-500" />

              <div className="font-mono text-red-500 text-[10px] tracking-widest uppercase mb-2 text-center">
                CHALLENGES ACCESS // PHASE_04
              </div>
              <h2 className="text-2xl font-bold tracking-wide uppercase mb-3 font-mono text-zinc-100 text-center">
                SELECT YOUR PRIMARY BATTLEFIELD
              </h2>
              <p className="text-zinc-400 text-xs mb-8 text-center max-w-md mx-auto">
                Customize training tasks and game intelligence checklist data based on your primary title.
              </p>

              {/* Game Cards Grid (Staggered Entrance Layout) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { name: "Valorant", icon: <Shield className="w-8 h-8 text-pink-500" />, themeColor: "hover:border-pink-500 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]" },
                  { name: "CS2", icon: <Swords className="w-8 h-8 text-cyan-400" />, themeColor: "hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" },
                  { name: "LoL", icon: <Award className="w-8 h-8 text-amber-500" />, themeColor: "hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]" },
                  { name: "Fortnite", icon: <Zap className="w-8 h-8 text-purple-500" />, themeColor: "hover:border-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]" },
                  { name: "PUBG", icon: <Gamepad2 className="w-8 h-8 text-red-500" />, themeColor: "hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]" },
                ].map((game, idx) => (
                  <motion.button
                    key={game.name}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => {
                      setFieldOfStudy(game.name);
                      handleSignUp(game.name);
                    }}
                    data-sound="select-game"
                    className={`flex flex-col items-center justify-center p-6 bg-zinc-950/80 border border-zinc-800 rounded-none transition-all duration-300 group ${game.themeColor} min-h-[140px]`}
                  >
                    <div className="mb-4 transform group-hover:scale-110 transition-transform">
                      {game.icon}
                    </div>
                    <span className="text-zinc-100 font-mono text-sm tracking-wider uppercase font-bold group-hover:text-white">
                      {game.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* LOGIN QUESTION 1: IDENTIFY YOURSELF */}
          {scene === "signin-email" && (
            <motion.div
              key="signin-email"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute left-1/2 md:left-[55%] top-[40%] md:top-[45%] -translate-x-1/2 md:-translate-x-0 w-full max-w-md p-8 md:p-10 bg-black/60 backdrop-blur-xl border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] relative animate-[drawLines_1.5s_ease-out]"
            >
              <div className="absolute top-0 left-0 w-[30px] h-[3px] bg-amber-500" />
              <div className="absolute top-0 left-0 w-[3px] h-[30px] bg-amber-500" />
              <div className="absolute bottom-0 right-0 w-[30px] h-[3px] bg-amber-500" />
              <div className="absolute bottom-0 right-0 w-[3px] h-[30px] bg-amber-500" />

              <div className="font-mono text-amber-500 text-[10px] tracking-widest uppercase mb-2">
                VERIFY AGENT // PHASE_01
              </div>
              <h2 className="text-2xl font-bold tracking-wide uppercase mb-3 font-mono text-zinc-100 flex items-center gap-2">
                <Mail size={18} className="text-amber-500" />
                IDENTIFY YOURSELF
              </h2>
              <p className="text-zinc-400 text-xs mb-6">
                Access security logs with your registered mail profile.
              </p>

              <input
                type="email"
                placeholder="agent@nexus.gg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-amber-500/30 text-white py-3 px-1 outline-none text-base placeholder-zinc-700 focus:border-amber-500 transition-all duration-300 font-mono tracking-widest"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && email && goTo("signin-password")}
              />

              <div className="mt-8 flex justify-end">
                <button
                  disabled={!email}
                  onClick={() => goTo("signin-password")}
                  data-sound="click-next"
                  className="px-6 py-2 border border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/10 text-amber-400 rounded-none text-xs font-mono uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  DECRYPT SIGN IN →
                </button>
              </div>
            </motion.div>
          )}

          {/* LOGIN QUESTION 2: CONFIRM YOUR CIPHER */}
          {scene === "signin-password" && (
            <motion.div
              key="signin-password"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="absolute right-6 md:right-[10%] bottom-[10%] w-full max-w-md p-8 md:p-10 bg-black/60 backdrop-blur-xl border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.05)] relative"
            >
              <div className="absolute top-0 left-0 w-[30px] h-[3px] bg-cyan-500" />
              <div className="absolute top-0 left-0 w-[3px] h-[30px] bg-cyan-500" />
              <div className="absolute bottom-0 right-0 w-[30px] h-[3px] bg-cyan-500" />
              <div className="absolute bottom-0 right-0 w-[3px] h-[30px] bg-cyan-500" />

              <div className="font-mono text-cyan-400 text-[10px] tracking-widest uppercase mb-2">
                VERIFY AGENT // PHASE_02
              </div>
              <h2 className="text-2xl font-bold tracking-wide uppercase mb-3 font-mono text-zinc-100 flex items-center gap-2">
                <Lock size={18} className="text-cyan-400" />
                CONFIRM YOUR CIPHER
              </h2>
              <p className="text-zinc-400 text-xs mb-6">
                Input authentication key sequence to trigger system access.
              </p>

              <div className="relative mb-6">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Cipher Key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-cyan-500/30 text-white py-3 px-1 pr-10 outline-none text-base placeholder-zinc-700 focus:border-cyan-500 transition-all duration-300 font-mono tracking-widest"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && password && handleSignIn()}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-4 text-cyan-500/40 hover:text-cyan-500"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  disabled={!password || loading}
                  onClick={handleSignIn}
                  data-sound="click-verify"
                  className="px-6 py-2 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400 rounded-none text-xs font-mono uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  {loading ? "PROCESSING..." : "UNLOCK OS ACCESS →"}
                </button>
              </div>
            </motion.div>
          )}

          {/* FINAL SYSTEM INITIALIZING */}
          {scene === "final" && (
            <motion.div
              key="final"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.15, opacity: 1 }}
              transition={{ duration: 3.5, ease: "easeOut" }}
              className="flex flex-col items-center justify-center text-center"
            >
              <h2 className="text-4xl md:text-5xl font-mono tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 uppercase font-extrabold drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                NEXUS INITIALIZING
              </h2>
              <p className="text-cyan-400 font-mono tracking-widest text-xs mt-4 uppercase">
                Synchronizing checklist database pipelines...
              </p>

              {/* Progress Loading Bar */}
              <div className="w-64 h-[2px] bg-white/10 mt-8 relative overflow-hidden">
                <motion.div
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 3.2, ease: "easeInOut", repeat: 0 }}
                  className="absolute inset-y-0 w-1/2 bg-amber-500 shadow-[0_0_10px_#f59e0b]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
