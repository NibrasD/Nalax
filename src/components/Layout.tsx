import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from './Toast';

export function Layout() {
  return (
    <div className="min-h-screen bg-atmosphere relative">
      {/* Ambient orbs — soft, low-intensity background depth */}
      <div
        className="ambient-orb w-[520px] h-[520px] -top-60 -left-60"
        style={{ background: 'var(--color-primary-glow)' }}
      />
      <div
        className="ambient-orb w-[420px] h-[420px] top-1/2 -right-40"
        style={{ background: 'var(--color-accent-glow)', animationDelay: '3s' }}
      />

      <Navbar />
      <ToastContainer />

      <main className="relative z-10 pt-24 pb-16 px-6 max-w-7xl mx-auto min-h-[80vh]">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
