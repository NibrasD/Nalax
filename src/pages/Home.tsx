import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ArticleCard } from '../components/ArticleCard';
import { ArrowRight, Zap, Shield, Coins, PenSquare, Hash, Users, BookOpen, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function Home() {
  const { t } = useTranslation();
  const articles = useAppStore(state => state.articles);
  
  const HERO_WORDS = [
    t('words.publish'),
    t('words.tokenize'),
    t('words.monetize'),
    t('words.own')
  ];

  const HOW_IT_WORKS = [
    {
      step: '01',
      title: t('home.how_it_works.steps.01.title'),
      description: t('home.how_it_works.steps.01.description'),
      icon: Shield,
      color: 'primary',
    },
    {
      step: '02',
      title: t('home.how_it_works.steps.02.title'),
      description: t('home.how_it_works.steps.02.description'),
      icon: PenSquare,
      color: 'accent',
    },
    {
      step: '03',
      title: t('home.how_it_works.steps.03.title'),
      description: t('home.how_it_works.steps.03.description'),
      icon: Coins,
      color: 'primary',
    },
  ];

  const featuredArticles = articles.slice(0, 3);
  const [heroWordIdx, setHeroWordIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroWordIdx(prev => (prev + 1) % HERO_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-32 py-8">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="grid lg:grid-cols-2 gap-16 items-center min-h-[70vh] relative">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/[0.06] to-transparent rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col gap-7 relative z-10 animate-fadeIn">
          <span className="eyebrow inline-flex items-center gap-2 w-fit">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            {t('home.hero.eyebrow')}
          </span>
          
          <h1 className="font-serif text-[60px] lg:text-[76px] leading-[1.02] font-normal tracking-[-2.5px]">
            {t('home.hero.title', { word: '' }).split('{{word}}')[0]}<br />
            <span className="text-gradient inline-block transition-all duration-500" key={heroWordIdx}>
              {HERO_WORDS[heroWordIdx]}
            </span><br />
            <span className="text-[var(--color-text-secondary)]">{t('home.hero.title', { word: '' }).split('{{word}}')[1]}</span>
          </h1>
          
          <p className="text-[17px] leading-[1.65] text-[var(--color-text-dim)] max-w-lg">
            {t('home.hero.subtitle')}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link to="/write" className="btn-primary flex items-center gap-2 group w-fit">
              {t('home.hero.start_writing')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
            </Link>
            <Link to="/explore" className="btn-outline w-fit">
              {t('home.hero.explore_articles')}
            </Link>
          </div>
        </div>

        {/* Hero Card */}
        <div className="relative animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-2xl blur-3xl -z-10 animate-glowPulse" />
          
          <div className="glass-panel p-7 relative group hover:border-[var(--color-border-bright)] transition-all duration-500">
            {/* Simulated content preview */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Hash className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[13px] font-medium">{t('home.hero.content_nft')}</div>
                <div className="text-[10px] font-mono text-primary uppercase tracking-wider">{t('home.hero.minting_via')}</div>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="h-5 bg-white/[0.03] rounded-sm w-4/5" />
              <div className="h-4 bg-white/[0.03] rounded-sm w-full" />
              <div className="h-4 bg-white/[0.03] rounded-sm w-3/4" />
              <div className="h-4 bg-white/[0.03] rounded-sm w-5/6" />
            </div>

            <div className="pt-6 border-t border-[var(--color-border)] grid grid-cols-3 gap-4">
              <div>
                <div className="label-sm mb-1">{t('home.hero.author')}</div>
                <div className="text-[13px] font-mono text-primary">GBX4...WT7I</div>
              </div>
              <div>
                <div className="label-sm mb-1">{t('home.hero.hash')}</div>
                <div className="text-[13px] font-mono text-[var(--color-text-secondary)]">a1b2c3...</div>
              </div>
              <div>
                <div className="label-sm mb-1">{t('home.hero.status')}</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-[13px] font-mono text-accent">{t('home.hero.minted')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -bottom-4 -left-4 glass-panel-elevated px-5 py-3 flex items-center gap-3 animate-float">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-semibold">{t('home.hero.token_gated')}</div>
              <div className="text-[10px] text-[var(--color-text-dim)] font-mono">{t('home.hero.access_fee')}</div>
            </div>
          </div>

          {/* Floating badge 2 */}
          <div className="absolute -top-4 -right-4 glass-panel-elevated px-4 py-2 animate-float" style={{ animationDelay: '2s' }}>
            <div className="text-[10px] font-mono text-accent uppercase tracking-wider">{t('home.hero.tip')}</div>
          </div>
        </div>
      </section>


      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-14">
          <span className="eyebrow">{t('home.how_it_works.eyebrow')}</span>
          <h2 className="text-[40px] font-serif tracking-[-1px]">{t('home.how_it_works.title')}</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 stagger-children">
          {HOW_IT_WORKS.map(({ step, title, description, icon: Icon, color }) => (
            <div key={step} className="glass-panel p-8 group hover:border-[var(--color-border-bright)] transition-all duration-300 relative overflow-hidden">
              {/* Step number background */}
              <span className="absolute -top-6 -right-4 text-[120px] font-serif font-bold text-white/[0.015] leading-none select-none">
                {step}
              </span>
              
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                color === 'accent' ? 'bg-accent/10 border border-accent/20' : 'bg-primary/10 border border-primary/20'
              }`}>
                <Icon className={`w-5 h-5 ${color === 'accent' ? 'text-accent' : 'text-primary'}`} />
              </div>
              
              <div className="label-sm mb-2">{t('home.how_it_works.step')} {step}</div>
              <h3 className="text-xl font-serif mb-3">{title}</h3>
              <p className="text-[13px] text-[var(--color-text-dim)] leading-[1.6]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Articles ────────────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="eyebrow">{t('home.featured.eyebrow')}</span>
            <h2 className="text-[40px] font-serif tracking-[-1px]">{t('home.featured.title')}</h2>
          </div>
          <Link to="/explore" className="btn-outline text-[11px] py-2.5 px-5 flex items-center gap-2">
            {t('home.featured.view_all')} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {featuredArticles.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} />
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 rounded-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-transparent to-[var(--color-bg-base)] opacity-60" />
        
        <div className="relative z-10 text-center py-20 px-8">
          <h2 className="text-[44px] font-serif tracking-[-1px] mb-4">
            {t('home.cta.title').split('*')[0]}<span className="text-gradient">{t('home.cta.title').split('*')[1]}</span>{t('home.cta.title').split('*')[2]}
          </h2>
          <p className="text-[16px] text-[var(--color-text-dim)] max-w-lg mx-auto mb-8 leading-relaxed">
            {t('home.cta.subtitle')}
          </p>
          <Link to="/write" className="btn-accent inline-flex items-center gap-2 group">
            {t('home.cta.start_writing')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
