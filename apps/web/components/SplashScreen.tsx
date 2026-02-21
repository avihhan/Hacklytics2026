"use client";

import React, { useEffect, useMemo, useState } from "react";
import TaxPilotIcon from "@/components/TaxPilotIcon";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<"entering" | "loaded" | "exiting">(
    "entering"
  );

  const symbols = useMemo(() => {
    const glyphs = [
      "$",
      "1040",
      "W-2",
      "1099",
      "1098",
      "RAG",
      "MCP",
      "AI",
      "IRS",
      "GA",
      "{ }",
      "</>",
      "=>",
      "[]",
      "∑",
      "✓",
    ];

    return glyphs.map((g, i) => ({
      g,
      left: 12 + ((i * 17) % 76),
      top: 14 + ((i * 23) % 70),
      delay: i * 0.12,
      size: 14 + (i % 4) * 6,
      opacity: 0.14 + (i % 4) * 0.04,
    }));
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("loaded"), 2200);
    const t2 = setTimeout(() => setPhase("exiting"), 6800);
    const t3 = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 7600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] bg-slate-950 transition-all duration-700 ${
        phase === "exiting" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Keyframes for glitch + sweep */}
      <style jsx global>{`
        @keyframes tp-glitch-1 {
          0% { transform: translate(0, 0); opacity: 0.55; }
          7% { transform: translate(-1px, 0.5px); opacity: 0.8; }
          10% { transform: translate(1.5px, -0.5px); opacity: 0.6; }
          14% { transform: translate(-1px, -1px); opacity: 0.85; }
          18% { transform: translate(0.5px, 1px); opacity: 0.6; }
          22% { transform: translate(0, 0); opacity: 0.55; }
          100% { transform: translate(0, 0); opacity: 0.55; }
        }
        @keyframes tp-glitch-2 {
          0% { transform: translate(0, 0); opacity: 0.35; }
          6% { transform: translate(1px, 0); opacity: 0.7; }
          11% { transform: translate(-1.2px, 0.6px); opacity: 0.45; }
          15% { transform: translate(1.6px, -0.8px); opacity: 0.8; }
          19% { transform: translate(-0.8px, -0.6px); opacity: 0.55; }
          24% { transform: translate(0, 0); opacity: 0.35; }
          100% { transform: translate(0, 0); opacity: 0.35; }
        }
        @keyframes tp-flicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 0.95; }
          94% { opacity: 0.65; }
          95% { opacity: 0.95; }
          97% { opacity: 0.75; }
          98% { opacity: 1; }
        }
        @keyframes tp-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Neon grid */}
        <div className="absolute inset-0 opacity-[0.14]">
          <div className="grid h-full grid-cols-12">
            {Array.from({ length: 12 * 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square border border-emerald-400/20"
                style={{ animationDelay: `${(i % 12) * 0.08}s` }}
              />
            ))}
          </div>
        </div>

        {/* Scanlines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-soft-light">
          <div className="h-full w-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:100%_6px]" />
        </div>

        {/* Moving light sweep */}
        <div
          className={`pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-300/10 to-transparent blur-xl transition-transform duration-[2200ms] ease-out ${
            phase === "entering" ? "translate-x-0" : "translate-x-[220%]"
          }`}
        />

        {/* Floating cubes */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`absolute h-6 w-6 sm:h-8 sm:w-8 border border-cyan-300/25 rotate-45 animate-pulse ${
              phase === "entering"
                ? "opacity-0 translate-y-6"
                : "opacity-100 translate-y-0"
            } transition-all duration-1000`}
            style={{
              left: `${10 + (i % 4) * 22}%`,
              top: `${18 + Math.floor(i / 4) * 38}%`,
              animationDelay: `${i * 0.25}s`,
              animationDuration: "3.2s",
            }}
          />
        ))}

        {/* Tax/AI glyphs */}
        <div className="absolute inset-0">
          {symbols.map((s, i) => (
            <div
              key={`${s.g}-${i}`}
              className={`absolute font-mono transition-all duration-1000 ${
                phase === "entering"
                  ? "opacity-0 translate-y-8"
                  : "opacity-100 translate-y-0"
              }`}
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                fontSize: `${s.size}px`,
                opacity: s.opacity,
                color: i % 2 === 0 ? "rgb(52 211 153)" : "rgb(34 211 238)",
                animationDelay: `${s.delay}s`,
              }}
            >
              {s.g}
            </div>
          ))}
        </div>

        {/* Corner brackets */}
        <div className="absolute top-4 left-4 sm:top-8 sm:left-8 h-14 w-14 sm:h-20 sm:w-20 border-l-2 border-t-2 border-emerald-400/30" />
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 h-14 w-14 sm:h-20 sm:w-20 border-r-2 border-t-2 border-cyan-400/30" />
        <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 h-14 w-14 sm:h-20 sm:w-20 border-l-2 border-b-2 border-cyan-400/30" />
        <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 h-14 w-14 sm:h-20 sm:w-20 border-r-2 border-b-2 border-emerald-400/30" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center px-4">
        {/* Logo block */}
        <div
          className={`mb-10 transition-all duration-1000 ${
            phase === "entering"
              ? "opacity-0 scale-75 rotate-180"
              : "opacity-100 scale-100 rotate-0"
          }`}
        >
          <div className="relative mx-auto h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40">
            {/* Radar rings */}
            <div className="absolute inset-0 rounded-full border border-emerald-400/20" />
            <div className="absolute inset-4 rounded-full border border-cyan-400/15" />
            <div className="absolute inset-8 rounded-full border border-emerald-400/10" />

            {/* Radar sweep (arc) */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(34,211,238,0.0) 0deg, rgba(34,211,238,0.0) 290deg, rgba(34,211,238,0.22) 315deg, rgba(52,211,153,0.35) 340deg, rgba(34,211,238,0.0) 360deg)",
                filter: "blur(0.2px)",
                animation: "tp-sweep 1.35s linear infinite",
              }}
            />
            {/* Mask center so sweep looks like a ring */}
            <div className="absolute inset-6 rounded-full bg-slate-950" />

            {/* Neon plate */}
            <div className="absolute inset-9 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md shadow-[0_0_85px_rgba(52,211,153,0.32)] flex items-center justify-center">
              <TaxPilotIcon className="h-14 w-14 text-emerald-300 drop-shadow-[0_0_22px_rgba(52,211,153,0.55)]" />
            </div>

            {/* Tiny “ping” dot */}
            <div className="absolute left-[78%] top-[18%] h-2 w-2 rounded-full bg-cyan-300/80 shadow-[0_0_16px_rgba(34,211,238,0.75)] animate-ping" />
          </div>
        </div>

        {/* Glitch title */}
        <div
          className={`transition-all duration-1000 delay-200 ${
            phase === "entering"
              ? "opacity-0 translate-y-8"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="relative inline-block">
            {/* Base */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
              style={{ animation: "tp-flicker 3.8s infinite" }}
            >
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                TaxPilot
              </span>
            </h1>

            {/* Glitch layers */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ mixBlendMode: "screen" }}
            >
              <div
                className="absolute inset-0 font-bold tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                style={{
                  color: "rgba(34,211,238,0.65)",
                  textShadow: "0 0 20px rgba(34,211,238,0.35)",
                  animation: "tp-glitch-1 2.7s infinite",
                }}
              >
                TaxPilot
              </div>
              <div
                className="absolute inset-0 font-bold tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                style={{
                  color: "rgba(52,211,153,0.55)",
                  textShadow: "0 0 22px rgba(52,211,153,0.35)",
                  animation: "tp-glitch-2 3.1s infinite",
                }}
              >
                TaxPilot
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="h-[2px] w-16 sm:w-24 bg-gradient-to-r from-transparent to-emerald-300/70 rounded-full" />
            <div className="h-9 w-9 rounded-full border border-emerald-300/40 bg-black/30 flex items-center justify-center">
              <span className="font-mono text-xs text-emerald-200">AI</span>
            </div>
            <div className="h-[2px] w-16 sm:w-24 bg-gradient-to-l from-transparent to-cyan-300/70 rounded-full" />
          </div>

          <h2 className="mt-5 text-lg sm:text-xl md:text-2xl font-light tracking-[0.35em] text-white/80">
            FILING READINESS ENGINE
          </h2>
        </div>

        {/* Subtitle */}
        <div
          className={`mt-6 transition-all duration-1000 delay-400 ${
            phase === "entering"
              ? "opacity-0 translate-y-8"
              : "opacity-100 translate-y-0"
          }`}
        >
          <p className="text-white/70 text-base sm:text-lg max-w-md mx-auto">
            Upload docs → extract signals → get grounded guidance.
          </p>
          <p className="mt-2 text-emerald-200/80 text-sm sm:text-base font-mono">
            Hacklytics 2026 • Golden Byte
          </p>
        </div>

        {/* Loading */}
        <div
          className={`mt-14 transition-all duration-1000 delay-600 ${
            phase === "entering" ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-white/50 font-mono text-xs sm:text-sm">
              Booting TaxPilot core
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-emerald-300/80 animate-pulse"
                  style={{
                    animationDelay: `${i * 0.25}s`,
                    animationDuration: "1.25s",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 w-60 sm:w-72 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-[2200ms] ease-out"
              style={{ width: phase === "loaded" ? "100%" : "8%" }}
            />
          </div>
        </div>

        {/* Bottom terminal line */}
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-800 ${
            phase === "entering"
              ? "opacity-0 translate-y-6"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="flex items-center gap-2 text-white/45 text-xs sm:text-sm font-mono px-4">
            <span className="text-emerald-300/70">$</span>
            <span className="animate-pulse">taxpilot --init --mode=demo</span>
            <div className="h-4 w-[2px] bg-cyan-300/70 animate-pulse ml-1" />
          </div>
        </div>
      </div>

      {/* Exit overlay */}
      <div
        className={`absolute inset-0 bg-slate-950 transition-opacity duration-700 ${
          phase === "exiting" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

export default SplashScreen;