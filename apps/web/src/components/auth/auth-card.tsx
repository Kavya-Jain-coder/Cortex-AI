import Image from "next/image";
import Link from "next/link";

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
        quality={100}
        className="object-cover -z-10"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-golden/20 bg-black/70 p-7 shadow-[0_24px_80px_hsl(0_0%_0%/0.5)] backdrop-blur-xl">
        <Link href="/" className="mb-6 flex items-center">
          <Image
            src="/images/logo-transparent.png"
            alt="Cortex Logo"
            width={180}
            height={48}
            className="object-contain"
          />
        </Link>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-normal">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
