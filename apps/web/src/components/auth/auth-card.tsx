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
      {/* Dark overlay for readability (removed to prevent dimming) */}
      <div className="absolute inset-0 bg-transparent" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8 shadow-[0_8px_40px_rgb(0_0_0_/_0.8)] backdrop-blur-2xl sm:p-10">
        {/* Subtle golden top glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-golden/50 to-transparent" />
        
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/logo-transparent.png"
            alt="Cortex Logo"
            width={180}
            height={48}
            className="object-contain drop-shadow-md"
          />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{description}</p>
        </div>
        {children}
        {footer && <div className="mt-8 text-center text-sm text-zinc-500">{footer}</div>}
      </div>
    </main>
  );
}
