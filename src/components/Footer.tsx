import { Gem, Github, ExternalLink, Hash, Zap, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const NAV_COLS = [
  {
    title: 'المنصة',
    links: [
      { to: '/feed',      label: 'الخلاصة' },
      { to: '/channels',  label: 'القنوات' },
      { to: '/explore',   label: 'استكشف' },
      { to: '/write',     label: 'اكتب مقالاً' },
      { to: '/dashboard', label: 'لوحة التحكم' },
    ],
  },
  {
    title: 'النظام البيئي',
    links: [
      { href: 'https://stellar.org',          label: 'Stellar Network' },
      { href: 'https://soroban.stellar.org',  label: 'Soroban Docs' },
      { href: 'https://freighter.app',        label: 'Freighter Wallet' },
      { href: 'https://github.com/DeshaDev/nalax', label: 'Source Code', icon: Github },
    ],
  },
];

const CHANNEL_QUICK = [
  { id: 'stellar-dev',     icon: '⚡', name: 'Stellar Developers' },
  { id: 'arabic-web3',    icon: '🌍', name: 'Web3 العربي' },
  { id: 'content-creators', icon: '✍️', name: 'صانعو المحتوى' },
  { id: 'defi-mena',      icon: '💰', name: 'DeFi MENA' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-[var(--color-border)] mt-16 overflow-hidden">

      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Subtle background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(124,77,255,0.05) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 relative z-10">


        {/* ── Main grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-5 group w-fit">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(124,77,255,0.3)] group-hover:shadow-[0_0_28px_rgba(124,77,255,0.5)] transition-all">
                <Gem className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-[20px] font-serif tracking-[-0.5px]">
                Stellar<span className="text-gradient">Scribe</span>
              </span>
            </Link>

            <p className="text-[13px] text-[var(--color-text-dim)] leading-[1.7] mb-5 max-w-[220px]">
              منصة النشر اللامركزي الأولى للمجتمع العربي، مبنية على Stellar وعقود Soroban الذكية.
            </p>

            {/* Live status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-accent/20 bg-accent/5 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="text-[10px] font-mono text-accent uppercase tracking-[1.5px]">
                Soroban Testnet
              </span>
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-5">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {'to' in link ? (
                      <Link
                        to={link.to}
                        className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors flex items-center gap-1.5 group"
                      >
                        {link.label}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors flex items-center gap-1.5 group"
                      >
                        {'icon' in link && link.icon && <link.icon className="w-3 h-3" />}
                        {link.label}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Channels quick links */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-5 flex items-center gap-1.5">
              <Hash className="w-3 h-3" /> القنوات
            </h4>
            <ul className="space-y-2.5">
              {CHANNEL_QUICK.map(({ id, icon, name }) => (
                <li key={id}>
                  <Link
                    to={`/channels/${id}`}
                    className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors group"
                  >
                    <span className="text-base leading-none">{icon}</span>
                    <span>{name}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity ml-auto" />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/channels"
                  className="text-[11px] font-mono text-primary hover:text-white transition-colors flex items-center gap-1 mt-2"
                >
                  عرض كل القنوات <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────── */}
        <div className="pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-[1px]">
            © 2025 StellarScribe — Built on Stellar
          </div>

          <div className="flex items-center gap-5">
            {[
              { dot: 'bg-primary', label: 'Soroban Contracts' },
              { dot: 'bg-accent',  label: 'IPFS Storage' },
              { dot: 'bg-rose',    label: 'Freighter Wallet' },
            ].map(({ dot, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-[1px]">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
