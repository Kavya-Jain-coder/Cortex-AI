import Image from "next/image";

export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      {/* Background image */}
      <Image
        src="/images/auth-bg.jpg"
        alt=""
        fill
        priority
        unoptimized
        className="object-cover -z-20"
      />

      {/* Radial vignette — darkens edges so the background doesn't compete with the card */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Card — consistent sizing across login/signup */}
      <div className="relative z-10 w-full max-w-[28rem] overflow-hidden rounded-2xl border border-white/[0.06] bg-black/60 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {/* Golden top accent */}
        <div className="h-[2px] bg-gradient-to-r from-amber-700/0 via-amber-400/70 to-amber-700/0" />

        {/* Inner content — fixed padding for both pages */}
        <div className="px-10 pb-11 pt-10 sm:px-12 sm:pb-12 sm:pt-11">
          {/* Logo */}
          <div className="mb-7 flex justify-center">
            <Image
              src="/images/logo-transparent.png"
              alt="Cortex Logo"
              width={170}
              height={46}
              className="object-contain"
            />
          </div>

          {/* Title & description — sentence case, Cormorant Garamond for elegance with proper lowercase */}
          <div className="mb-8 text-center">
            <h1
              className="text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-white"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {title}
            </h1>
            <p className="mx-auto mt-2.5 max-w-[22rem] text-[0.82rem] leading-relaxed text-zinc-500">
              {description}
            </p>
          </div>

          {/* Form content */}
          {children}

          {/* Footer */}
          {footer && (
            <div className="mt-8 text-center text-[0.8rem] text-zinc-600">
              {footer}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
