import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from './Toast';

export function Layout() {
  return (
    <div className="min-h-screen bg-atmosphere relative">
      {/* Ambient orbs */}
      <div className="ambient-orb w-[500px] h-[500px] bg-primary/[0.04] -top-60 -left-60" />
      <div className="ambient-orb w-[400px] h-[400px] bg-accent/[0.03] top-1/2 -right-40" style={{ animationDelay: '3s' }} />
      
      <Navbar />
      <ToastContainer />
      
      <main className="relative z-10 pt-24 pb-16 px-6 max-w-7xl mx-auto min-h-[80vh]">
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
}
