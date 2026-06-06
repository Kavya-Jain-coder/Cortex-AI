export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <section className="max-w-3xl w-full bg-card text-card-foreground rounded-lg p-10 glow-golden">
        <h1 className="text-4xl font-bold mb-4 text-golden">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your dashboard. This page prevents a 404 when visiting /dashboard.</p>
      </section>
    </main>
  );
}
