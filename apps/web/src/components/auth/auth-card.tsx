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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background image */}
      <Image
        src="/images/auth-bg.jpg"
        alt=""
        fill
        priority
        unoptimized
        className="object-cover -z-10"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.08] bg-black/50 px-10 py-12 shadow-[0_16px_70px_rgb(0_0_0_/_0.7)] backdrop-blur-2xl sm:px-14 sm:py-14">
        {/* Golden top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        {/* Subtle inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-500/[0.04] to-transparent" />

        <div className="relative mb-10 flex justify-center">
          <Image
            src="/images/logo-transparent.png"
            alt="Cortex Logo"
            width={200}
            height={54}
            className="object-contain drop-shadow-lg"
          />
        </div>
        <div className="relative mb-10 text-center">
          <h1
            className="text-4xl font-bold tracking-wide text-white sm:text-[2.5rem]"
            style={{ fontFamily: "var(--font-cinzel-decorative), serif" }}
          >
            {title}
          </h1>
          <p
            className="mt-3 text-[0.9rem] leading-relaxed text-zinc-400"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            {description}
          </p>
        </div>
        <div className="relative">{children}</div>
        {footer && (
          <div
            className="relative mt-10 text-center text-sm text-zinc-500"
            style={{ fontFamily: "var(--font-cinzel), serif" }}
          >
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
