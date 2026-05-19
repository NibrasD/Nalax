import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../store/useWallet';
import { formatAddress } from '../lib/utils';
import { Wallet, PenSquare, Compass, LayoutDashboard, Gem, Menu, X, Sun, Moon, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function Navbar() {
  const { t, i18n } = useTranslation();
  
  const NAV_LINKS = [
    { to: '/feed', label: t('nav.feed', 'الخلاصة'), icon: Zap },
    { to: '/explore', label: t('nav.explore'), icon: Compass },
    { to: '/write', label: t('nav.write'), icon: PenSquare },
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
  ];

  const { isConnected, publicKey, connect, disconnect, isConnecting, balance } = useWallet();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[var(--color-bg-base)]/95 backdrop-blur-xl border-b border-[var(--color-border)]' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-all" />
              <Gem className="w-5 h-5 text-primary group-hover:text-accent transition-colors relative z-10" />
            </div>
            <span className="text-[22px] font-serif tracking-[-0.5px] text-white">
              Stellar<span className="text-gradient">Scribe</span>
            </span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-5 py-2.5 text-[14px] font-semibold tracking-[0.5px] transition-all duration-300 rounded-full flex items-center gap-2 border ${
                    isActive
                      ? 'text-white bg-primary border-primary shadow-[0_0_15px_rgba(108,58,255,0.4)]'
                      : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-[11px] font-mono text-primary">{formatAddress(publicKey)}</span>
                </div>
                <button 
                  onClick={disconnect}
                  className="text-[10px] font-mono uppercase tracking-[1px] text-[var(--color-text-dim)] hover:text-[var(--color-error)] transition-colors cursor-pointer px-2 py-1.5"
                >
                  {t('nav.disconnect', 'Disconnect')}
                </button>
                
                {/* Language Switcher */}
                <button 
                  onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
                  className="text-[12px] font-semibold uppercase tracking-[1px] text-primary hover:text-white hover:bg-primary transition-colors cursor-pointer px-3 py-2 border border-primary/20 rounded-full"
                >
                  {i18n.language === 'ar' ? 'EN' : 'AR'}
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer border border-transparent hover:border-[var(--color-border)]"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <button 
                  onClick={connect}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold text-[11px] font-mono uppercase tracking-[1.5px] hover:bg-gray-100 transition-all disabled:opacity-50 cursor-pointer rounded-sm"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  {isConnecting ? t('nav.connecting', 'Connecting...') : t('nav.connect_wallet')}
                </button>
                
                {/* Language Switcher */}
                <button 
                  onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
                  className="text-[12px] font-semibold uppercase tracking-[1px] text-primary hover:text-white hover:bg-primary transition-colors cursor-pointer px-3 py-2 border border-primary/20 rounded-full"
                >
                  {i18n.language === 'ar' ? 'EN' : 'AR'}
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer border border-transparent hover:border-[var(--color-border)]"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            )}

            {/* Mobile Toggle */}
            <button 
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white cursor-pointer p-1"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--color-bg-base)]/98 backdrop-blur-xl md:hidden animate-fadeIn">
          <div className="flex flex-col items-center justify-center h-full gap-8">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 text-[14px] font-mono uppercase tracking-[2px] text-[var(--color-text-secondary)] hover:text-white transition-colors"
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            
            <div className="border-t border-[var(--color-border)] pt-8 mt-4 w-48">
              {isConnected ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[11px] font-mono text-primary">{formatAddress(publicKey)}</span>
                  <button onClick={disconnect} className="text-[11px] font-mono uppercase text-[var(--color-error)] cursor-pointer">
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  onClick={connect}
                  disabled={isConnecting}
                  className="w-full py-3 bg-white text-black font-semibold text-[11px] font-mono uppercase tracking-[1.5px] cursor-pointer rounded-sm"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
