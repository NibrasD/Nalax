import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../store/useWallet';
import { formatAddress } from '../lib/utils';
import { Wallet, PenSquare, Compass, LayoutDashboard, Gem, Menu, X, Sun, Moon, Zap, Hash, Sparkles, LogOut, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EmailAuthModal } from './EmailAuthModal';

export function Navbar() {
  const { t, i18n } = useTranslation();

  const NAV_LINKS = [
    { to: '/feed',      label: t('nav.feed'),      icon: Zap },
    { to: '/channels',  label: t('nav.channels'),  icon: Hash },
    { to: '/explore',   label: t('nav.explore'),   icon: Compass },
    { to: '/write',     label: t('nav.write'),     icon: PenSquare },
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
  ];

  const { isConnected, publicKey, connect, disconnect, isConnecting, balance, provider } = useWallet();
  const location = useLocation();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'dark'
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // إغلاق wallet dropdown عند الضغط خارجه
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setShowWalletMenu(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleDisconnect = () => {
    disconnect();
    setShowWalletMenu(false);
  };

  const displayAddress = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : '';

  const displayName = displayAddress;

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[var(--color-bg-base)]/90 backdrop-blur-2xl border-b border-[var(--color-border)]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-xl"
                style={{ background: 'linear-gradient(135deg, rgba(91,94,255,0.4), rgba(15,244,198,0.3))', filter: 'blur(8px)' }} />
              <div className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #5B5EFF, #0FF4C6)', boxShadow: '0 0 20px rgba(91,94,255,0.5)' }}>
                <Gem className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
            <span className="text-[22px] font-serif tracking-[-0.5px] text-white">
              Na<span className="text-gradient">lax</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-sm">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-4 py-2 text-[13px] font-semibold transition-all duration-200 rounded-xl flex items-center gap-1.5 ${
                    isActive
                      ? 'text-white shadow-[0_0_20px_rgba(91,94,255,0.4)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                  style={isActive ? { background: 'linear-gradient(135deg, #5B5EFF, #4446D6)' } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">

            {isConnected ? (
              /* ── Connected State ──────────────────────────────── */
              <div className="hidden md:flex items-center gap-2">

                {/* Balance chip */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[11px] font-mono text-accent font-medium">{balance} XLM</span>
                </div>

                {/* Account dropdown */}
                <div className="relative" ref={walletMenuRef}>
                  <button
                    onClick={() => setShowWalletMenu(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full hover:border-[var(--color-border-bright)] transition-colors cursor-pointer"
                  >
                    {provider === 'quick-wallet' ? (
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span className="text-[12px] font-mono text-[var(--color-text-secondary)]">
                      {displayName}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform ${showWalletMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showWalletMenu && (
                    <div className="absolute left-0 mt-2 w-56 glass-panel-elevated rounded-xl border border-[var(--color-border)] py-1 shadow-2xl animate-fadeIn z-10">
                      <div className="px-4 py-2 border-b border-[var(--color-border)]">
                        <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">
                          {provider === 'quick-wallet' ? 'Quick Wallet' : 'Freighter Wallet'}
                        </div>
                        <div className="text-[11px] font-mono text-primary break-all" dir="ltr">
                          {publicKey?.slice(0, 8)}...{publicKey?.slice(-6)}
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnect}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error)]/5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {t('nav.disconnect')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Language + Theme */}
                <button
                  onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
                  className="text-[12px] font-semibold uppercase tracking-[1px] text-primary hover:text-white hover:bg-primary transition-colors cursor-pointer px-3 py-2 border border-primary/20 rounded-full"
                >
                  {i18n.language === 'ar' ? 'EN' : 'AR'}
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer border border-transparent hover:border-[var(--color-border)]"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              /* ── Not Connected ─────────────────────────────────── */
              <div className="hidden md:flex items-center gap-2">

                {/* Quick Wallet Button */}
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 font-semibold text-[11px] font-mono uppercase tracking-[1.5px] transition-all cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-primary/40 hover:bg-primary/5 text-[var(--color-text-secondary)] hover:text-white"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  محفظة فورية
                </button>

                {/* Freighter Button */}
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-5 py-2.5 font-semibold text-[11px] font-mono uppercase tracking-[1.5px] transition-all disabled:opacity-50 cursor-pointer rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #5B5EFF, #4446D6)', boxShadow: '0 4px 20px rgba(91,94,255,0.4)' }}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  {isConnecting ? t('nav.connecting') : t('nav.connect_wallet')}
                </button>

                {/* Language + Theme */}
                <button
                  onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
                  className="text-[12px] font-semibold uppercase tracking-[1px] text-primary hover:text-white hover:bg-primary transition-colors cursor-pointer px-3 py-2 border border-primary/20 rounded-full"
                >
                  {i18n.language === 'ar' ? 'EN' : 'AR'}
                </button>
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

      {/* ── Mobile Menu ───────────────────────────────────────────── */}
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

            <div className="border-t border-[var(--color-border)] pt-8 mt-4 w-52 space-y-3">
              {isConnected ? (
                <>
                  <div className="text-center">
                    <div className="text-[11px] font-mono text-accent mb-1">{balance} XLM</div>
                    <div className="text-[10px] font-mono text-primary">{formatAddress(publicKey)}</div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full py-2.5 text-[11px] font-mono uppercase text-[var(--color-error)] border border-[var(--color-error)]/20 rounded-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> {t('nav.disconnect')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setShowEmailModal(true); setMobileOpen(false); }}
                    className="w-full py-2.5 border border-[var(--color-border)] text-[11px] font-mono uppercase tracking-[1.5px] cursor-pointer rounded-sm flex items-center justify-center gap-2 text-[var(--color-text-secondary)]"
                  >
                    <Sparkles className="w-4 h-4" /> محفظة فورية
                  </button>
                  <button
                    onClick={connect}
                    disabled={isConnecting}
                    className="w-full py-2.5 bg-white text-black font-semibold text-[11px] font-mono uppercase tracking-[1.5px] cursor-pointer rounded-sm flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    {isConnecting ? t('nav.connecting') : t('nav.connect_wallet')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Email Auth Modal ──────────────────────────────────────── */}
      <EmailAuthModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </>
  );
}
