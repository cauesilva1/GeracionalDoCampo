import { AdminPanel } from "@/components/landing/AdminPanel";

export default function AdminPage() {
  return (
    <div className="relative min-h-screen bg-arena-bg px-4 py-12 text-brand-text">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,122,0,0.1)_0%,transparent_50%)]"
      />
      <div className="relative z-10">
        <AdminPanel />
      </div>
    </div>
  );
}
