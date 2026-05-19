import { Gem, Github, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-[var(--color-border)] mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Gem className="w-5 h-5 text-primary" />
              <span className="text-[18px] font-serif">
                Stellar<span className="text-gradient">Scribe</span>
              </span>
            </Link>
            <p className="text-[13px] text-[var(--color-text-dim)] leading-relaxed max-w-sm mb-6">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[1.5px] text-accent">
                {t('footer.testnet')}
              </span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-5">{t('footer.platform')}</h4>
            <ul className="space-y-3">
              <li><Link to="/explore" className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors">{t('nav.explore')}</Link></li>
              <li><Link to="/write" className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors">{t('nav.write')}</Link></li>
              <li><Link to="/dashboard" className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors">{t('nav.dashboard')}</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-5">{t('footer.ecosystem')}</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://stellar.org" target="_blank" rel="noreferrer" className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors inline-flex items-center gap-1.5">
                  {t('footer.stellar_network')} <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://soroban.stellar.org" target="_blank" rel="noreferrer" className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors inline-flex items-center gap-1.5">
                  {t('footer.soroban_docs')} <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://freighter.app" target="_blank" rel="noreferrer" className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors inline-flex items-center gap-1.5">
                  {t('footer.freighter_wallet')} <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="text-[13px] text-[var(--color-text-secondary)] hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Github className="w-3 h-3" /> {t('footer.source_code')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-[1px]">
            {t('footer.copyright')}
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-[1px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t('footer.smart_contracts')}
            </span>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-[1px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {t('footer.wallet')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
