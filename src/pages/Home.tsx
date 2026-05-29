import { Link } from 'react-router-dom';
import {
  ArrowRight, Zap, Shield, Coins, PenSquare, Hash,
  Users, BookOpen, TrendingUp, Sparkles, Lock, Globe,
  ChevronRight, MessageCircle, Heart, Gem,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useChannelStore } from '../store/useChannelStore';
import { fetchAllContentIds, fetchAllArticlesFromChain } from '../lib/stellar';

// ─── Live Ticker ─────────────────────────────────────────────────────────────

function LiveTicker() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden w-fit">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]" />
      </span>
      <span className="text-[11px] font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
        Stellar Testnet — Soroban Smart Contracts
      </span>
    </div>
  );
}


// ─── Animated Counter ────────────────────────────────────────────────────────

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(end / 60);
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(t); }
      else setVal(start);
    }, 18);
    return () => clearInterval(t);
  }, [end]);
  return <>{val.toLocaleString()}{suffix}</>;
}

// ─── Platform Stats ──────────────────────────────────────────────────────────
// Real stats are fetched from the contract in the component below

// ─── Features ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: PenSquare,
    color: 'primary',
    title: 'اكتب وانشر على السلسلة',
    desc: 'محرر Markdown احترافي مع نشر مباشر على Stellar. كل مقال يُسكّ كـ NFT موثّق إلى الأبد.',
    tag: 'Soroban Smart Contract',
  },
  {
    icon: Lock,
    color: 'rose',
    title: 'محتوى مشفوع بالدخول',
    desc: 'حوّل مقالاتك إلى محتوى مدفوع. القرّاء يدفعون XLM مباشرة لمحفظتك — بدون وسيط.',
    tag: 'Token-Gated Access',
  },
  {
    icon: Coins,
    color: 'accent',
    title: 'دعم مباشر بـ XLM',
    desc: 'صناديق الدعم المدمجة في كل منشور. القرّاء يرسلون XLM للكتّاب في ثوانٍ بدون رسوم.',
    tag: 'TipJar MiniApp',
  },
  {
    icon: Hash,
    color: 'amber',
    title: 'قنوات مجتمعية',
    desc: 'مجتمعات متخصصة مثل Reddit لكل اهتمام. انضم، ناقش، وشارك مع المجتمع العربي.',
    tag: 'Channels — جديد',
  },
  {
    icon: Sparkles,
    color: 'sky',
    title: 'MiniApps تفاعلية',
    desc: 'استطلاعات، مسابقات، تحديات يومية — كل هذا مدمج داخل منشوراتك مع تسجيل على السلسلة.',
    tag: 'Interactive MiniApps',
  },
  {
    icon: Shield,
    color: 'primary',
    title: 'هوية موثّقة على السلسلة',
    desc: 'سجّل هويتك ككاتب على Stellar. ملفك الشخصي وإنجازاتك محفوظة إلى الأبد.',
    tag: 'On-Chain Identity',
  },
];

const featureColor: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  primary: { bg: 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]', text: 'text-[var(--color-primary-strong)]', border: 'border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]', glow: 'group-hover:shadow-[0_0_32px_var(--color-primary-glow)]' },
  rose:    { bg: 'bg-[color-mix(in_srgb,var(--color-rose)_10%,transparent)]',    text: 'text-[var(--color-rose)]',           border: 'border-[color-mix(in_srgb,var(--color-rose)_25%,transparent)]',    glow: 'group-hover:shadow-[0_0_32px_var(--color-rose-glow)]' },
  accent:  { bg: 'bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]',  text: 'text-[var(--color-accent)]',         border: 'border-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]',  glow: 'group-hover:shadow-[0_0_32px_var(--color-accent-glow)]' },
  amber:   { bg: 'bg-[color-mix(in_srgb,var(--color-amber)_10%,transparent)]',   text: 'text-[var(--color-amber)]',          border: 'border-[color-mix(in_srgb,var(--color-amber)_25%,transparent)]',   glow: 'group-hover:shadow-[0_0_32px_color-mix(in_srgb,var(--color-amber)_22%,transparent)]' },
  sky:     { bg: 'bg-[color-mix(in_srgb,var(--color-sky)_10%,transparent)]',     text: 'text-[var(--color-sky)]',            border: 'border-[color-mix(in_srgb,var(--color-sky)_25%,transparent)]',     glow: 'group-hover:shadow-[0_0_32px_color-mix(in_srgb,var(--color-sky)_22%,transparent)]' },
};


// ─── Channel Preview Data ─────────────────────────────────────────────────────
// Uses real channel data from the store (injected in the component)

// ─── How It Works ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: '01', icon: Shield,    title: 'ربط المحفظة',      desc: 'اربط محفظة Freighter وسجّل هويتك على Stellar في دقيقة واحدة.', color: 'primary' },
  { n: '02', icon: PenSquare, title: 'اكتب وانشر',       desc: 'أنشئ مقالك في المحرر، اختر نوع النشر، وسكّ NFT بنقرة واحدة.', color: 'accent' },
  { n: '03', icon: Coins,     title: 'اكسب مباشرة',      desc: 'استلم XLM من القرّاء مباشرة لمحفظتك — بدون وسيط أو رسوم.', color: 'rose' },
];

// ─── Social Proof (removed — no fake testimonials) ───────────────────────────


// ─── Main Component ───────────────────────────────────────────────────────────

export function Home() {
  const { channels } = useChannelStore();

  // ─── Real on-chain stats ──────────────────────────────────────────────────
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalXlmRaised, setTotalXlmRaised] = useState(0);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const articles = await fetchAllArticlesFromChain();
        setTotalArticles(articles.length);
        // Sum total raised
        const raised = articles.reduce((sum: number, a: any) => sum + (a.totalRaised || 0), 0);
        setTotalXlmRaised(Math.round(raised));
        setStatsLoaded(true);
      } catch (e) {
        console.error('Failed to fetch on-chain stats:', e);
        setStatsLoaded(true);
      }
    })();
  }, []);

  const STATS = [
    { label: 'XLM أُرسل للكتّاب', end: totalXlmRaised,       suffix: '', color: 'text-[var(--color-rose)]' },
    { label: 'قناة نشطة',        end: channels.length,       suffix: '', color: 'text-[var(--color-amber)]' },
  ];

  return (
    <div className="flex flex-col">

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center pt-12 pb-24 overflow-hidden">

        {/* Background layers */}
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-primary-glow) 0%, var(--color-accent-soft) 40%, transparent 70%)' }} />
        <div className="absolute top-10 right-1/3 w-80 h-80 rounded-full blur-[110px] animate-glowPulse pointer-events-none"
          style={{ background: 'var(--color-primary-glow)' }} />
        <div className="absolute bottom-20 left-1/3 w-60 h-60 rounded-full blur-[90px] animate-glowPulse pointer-events-none"
          style={{ background: 'var(--color-accent-glow)', animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-10 w-40 h-40 rounded-full blur-[70px] animate-glowPulse pointer-events-none"
          style={{ background: 'var(--color-rose-glow)', animationDelay: '4s' }} />

        {/* Floating decoration orbs */}
        <div className="absolute top-28 left-16 w-3 h-3 rounded-full bg-primary/40 animate-floatSlow hidden lg:block" />
        <div className="absolute top-48 right-20 w-2 h-2 rounded-full bg-accent/50 animate-float hidden lg:block" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-28 w-2 h-2 rounded-full bg-rose/40 animate-floatSlow hidden lg:block" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-56 right-24 w-4 h-4 rounded-full bg-amber/20 animate-float hidden lg:block" style={{ animationDelay: '1.5s' }} />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 animate-fadeIn">
          {/* Live ticker */}
          <div className="flex justify-center mb-8">
            <LiveTicker />
          </div>

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[2px] font-medium"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 12%, transparent), color-mix(in srgb, var(--color-accent) 8%, transparent))',
                border: '1px solid color-mix(in srgb, var(--color-primary) 28%, transparent)',
                color: 'var(--color-primary-strong)',
              }}>
              <Gem className="w-3 h-3" style={{ color: 'var(--color-accent)' }} /> منصة نشر لامركزية على Stellar
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-[52px] sm:text-[68px] lg:text-[82px] leading-[1.05] tracking-[-2px] mb-6">
            امتلك محتواك،
            <br />
            <span className="text-gradient-animated">اكسب مباشرةً.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-[18px] text-[var(--color-text-dim)] leading-[1.7] max-w-2xl mx-auto mb-10">
            Nalax منصة النشر اللامركزي الأولى للمجتمع العربي — اكتب، سكّ محتواك NFT،
            شارك في قنوات متخصصة، واكسب XLM مباشرة بدون وسيط.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link to="/write" className="btn-primary flex items-center gap-2 group text-[13px]">
              ابدأ الكتابة الآن
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/channels" className="btn-outline flex items-center gap-2 text-[13px]">
              <Hash className="w-4 h-4" /> استكشف القنوات
            </Link>
            <Link to="/explore" className="btn-ghost flex items-center gap-2 text-[13px]">
              <BookOpen className="w-3.5 h-3.5" /> استعرض المقالات
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 max-w-md mx-auto mt-4 rounded-2xl overflow-hidden"
            style={{
              border: '1px solid color-mix(in srgb, var(--color-primary) 14%, transparent)',
              background: 'color-mix(in srgb, var(--color-bg-elevated) 85%, transparent)',
              backdropFilter: 'blur(20px)',
            }}>
            {STATS.map(({ label, end, suffix, color }, i) => (
              <div key={i} className={`px-6 py-5 text-center ${i === 0 ? 'border-r border-[var(--color-border)]' : ''}`}>
                <div className={`text-[28px] font-bold stat-number animate-countUp ${color}`} style={{ animationDelay: `${i * 0.15}s` }}>
                  <Counter end={end} suffix={suffix} />
                </div>
                <div className="text-[10px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="eyebrow justify-center">
              <Sparkles className="w-3.5 h-3.5" /> ما يميّزنا
            </span>
            <h2 className="text-[44px] font-serif tracking-[-1.5px] leading-tight">
              كل ما تحتاجه كمبدع رقمي
            </h2>
            <p className="text-[15px] text-[var(--color-text-dim)] mt-3 max-w-xl mx-auto leading-relaxed">
              منصة متكاملة تجمع النشر، التوثيق، المجتمع، والدخل في مكان واحد على Stellar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {FEATURES.map(({ icon: Icon, color, title, desc, tag }) => {
              const c = featureColor[color] || featureColor['primary'];
              return (
                <div key={title} className={`feature-card group p-7 ${c.glow} transition-all duration-300`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${c.bg} border ${c.border}`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <span className={`inline-block text-[9px] font-mono uppercase tracking-[1.5px] px-2.5 py-1 rounded-full mb-3 ${c.bg} ${c.text} border ${c.border}`}>
                    {tag}
                  </span>
                  <h3 className="text-[17px] font-semibold mb-2 leading-snug">{title}</h3>
                  <p className="text-[13px] text-[var(--color-text-dim)] leading-[1.65]">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          CHANNELS SPOTLIGHT
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 25%, transparent), color-mix(in srgb, var(--color-accent) 18%, transparent), transparent)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent)' }} />
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, var(--color-primary-glow) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-14">
            <div>
              <span className="eyebrow">
                <Hash className="w-3.5 h-3.5" /> القنوات — جديد
              </span>
              <h2 className="text-[44px] font-serif tracking-[-1.5px] leading-tight mb-4">
                مجتمعات متخصصة
                <br />
                <span className="text-gradient">مثل Reddit، على السلسلة</span>
              </h2>
              <p className="text-[15px] text-[var(--color-text-dim)] leading-[1.75] mb-8">
                انضم إلى قنوات تجمع المهتمين بـ Stellar، Web3، الفن الرقمي، والمحتوى العربي.
                شارك منشوراتك، صوّت في استطلاعات، وادعم الكتّاب — كل شيء موثّق على السلسلة.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/channels" className="btn-primary flex items-center gap-2 group">
                  <Hash className="w-4 h-4" /> استكشف القنوات
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/channels/create" className="btn-outline flex items-center gap-2">
                  أنشئ قناتك
                </Link>
              </div>
            </div>

            {/* Channel stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Hash,  label: 'قنوات نشطة',    val: String(channels.length),    color: 'text-primary', bg: 'bg-primary/10',  border: 'border-primary/20' },
                { icon: Users, label: 'عضو في القنوات', val: String(channels.reduce((s, c) => s + (c.memberCount || 0), 0)),  color: 'text-accent',  bg: 'bg-accent/10',   border: 'border-accent/20' },
                { icon: MessageCircle, label: 'منشور', val: String(channels.reduce((s, c) => s + (c.postCount || 0), 0)), color: 'text-rose', bg: 'bg-rose/10',     border: 'border-rose/20' },
                { icon: Heart, label: 'مقال على السلسلة',  val: String(totalArticles),   color: 'text-amber',   bg: 'bg-amber/10',    border: 'border-amber/20' },
              ].map(({ icon: Icon, label, val, color, bg, border }) => (
                <div key={label} className={`glass-panel p-5 border ${border} ${bg}/30 text-center`}>
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
                  <div className={`text-[26px] font-bold stat-number ${color}`}>{val}</div>
                  <div className="text-[10px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Channel Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {channels.slice(0, 6).map((ch) => (
              <Link key={ch.id} to={`/channels/${ch.slug || ch.id}`}
                className="channel-card-preview group p-5 flex items-center gap-4 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center text-2xl shrink-0 border border-white/5">
                  {ch.icon || '📡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14px] text-[var(--color-text-main)] group-hover:text-primary transition-colors truncate">
                    {ch.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-mono text-[var(--color-text-dim)] flex items-center gap-1">
                      <Users className="w-3 h-3" /> {ch.memberCount || 0}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-text-dim)] flex items-center gap-1">
                      <PenSquare className="w-3 h-3" /> {ch.postCount || 0}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
            {channels.length === 0 && (
              <div className="col-span-full text-center py-8 text-[var(--color-text-dim)] text-sm">
                لا توجد قنوات بعد — <Link to="/channels/create" className="text-primary hover:underline">أنشئ أول قناة</Link>
              </div>
            )}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="eyebrow justify-center">
              <Zap className="w-3.5 h-3.5" /> كيف تعمل المنصة
            </span>
            <h2 className="text-[44px] font-serif tracking-[-1.5px]">ثلاث خطوات للبدء</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.7%+2rem)] right-[calc(16.7%+2rem)] h-px bg-gradient-to-r from-primary/20 via-accent/30 to-rose/20" />

            {STEPS.map(({ n, icon: Icon, title, desc, color }, i) => {
              const c = featureColor[color] || featureColor['primary'];
              return (
                <div key={n} className="relative glass-panel p-8 text-center animate-fadeIn" style={{ animationDelay: `${i * 0.15}s` }}>
                  {/* Step circle */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 ${c.bg} border-2 ${c.border} relative z-10 bg-[var(--color-surface)]`}>
                    <Icon className={`w-6 h-6 ${c.text}`} />
                  </div>
                  <div className={`text-[10px] font-mono uppercase tracking-[2px] ${c.text} mb-2`}>الخطوة {n}</div>
                  <h3 className="text-[18px] font-semibold mb-3">{title}</h3>
                  <p className="text-[13px] text-[var(--color-text-dim)] leading-[1.65]">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          LIVE PLATFORM PREVIEW (NFT card mockup)
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <div className="animate-fadeIn">
              <span className="eyebrow">
                <Gem className="w-3.5 h-3.5" /> النشر على السلسلة
              </span>
              <h2 className="text-[42px] font-serif tracking-[-1.5px] leading-tight mb-5">
                كل مقال يُسكّ
                <br />
                <span className="text-gradient">كـ NFT دائم</span>
              </h2>
              <div className="space-y-4 mb-8">
                {[
                  { icon: Shield, text: 'المحتوى محفوظ على IPFS ومُثبَّت على Stellar للأبد' },
                  { icon: Lock,   text: 'يمكنك تحديد سعر الوصول — القرّاء يدفعون XLM مباشرة' },
                  { icon: TrendingUp, text: 'تتابع إحصائيات مقالاتك لحظياً: قرّاء، دعم، إيرادات' },
                  { icon: Globe,  text: 'كل العالم يستطيع قراءة ومشاركة محتواك بلا قيود' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[14px] text-[var(--color-text-secondary)] leading-[1.6]">{text}</p>
                  </div>
                ))}
              </div>
              <Link to="/write" className="btn-primary flex items-center gap-2 group w-fit">
                ابدأ الكتابة مجاناً
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Right — NFT card mockup */}
            <div className="relative animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 to-accent/10 rounded-3xl blur-3xl -z-10 animate-glowPulse" />
              <div className="hero-card p-6">
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Gem className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold">Content NFT</div>
                      <div className="text-[9px] font-mono text-primary/70 uppercase tracking-wider">Stellar Testnet</div>
                    </div>
                  </div>
                  <span className="badge badge-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" /> مسكوك
                  </span>
                </div>

                {/* Skeleton content */}
                <div className="space-y-2.5 mb-5">
                  <div className="h-5 bg-white/[0.04] rounded-lg w-3/4 animate-shimmer" />
                  <div className="h-3.5 bg-white/[0.03] rounded-lg w-full animate-shimmer" style={{ animationDelay: '.1s' }} />
                  <div className="h-3.5 bg-white/[0.03] rounded-lg w-5/6 animate-shimmer" style={{ animationDelay: '.2s' }} />
                  <div className="h-3.5 bg-white/[0.03] rounded-lg w-4/5 animate-shimmer" style={{ animationDelay: '.3s' }} />
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--color-bg-base)]/60 border border-[var(--color-border)] mb-4">
                  {[
                    { label: 'الكاتب',   val: 'GBX4...WT7I', color: 'text-primary' },
                    { label: 'IPFS Hash', val: 'Qm3x...f8a2', color: 'text-[var(--color-text-secondary)]' },
                    { label: 'السعر',    val: '5 XLM',       color: 'text-accent' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="label-sm mb-1">{label}</div>
                      <div className={`text-[11px] font-mono ${color}`}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-4 border-t border-[var(--color-border)]">
                  {[
                    { icon: BookOpen, val: '—', label: 'قارئ' },
                    { icon: Heart,    val: '—',  label: 'دعم' },
                    { icon: TrendingUp, val: '— XLM', label: 'إجمالي' },
                  ].map(({ icon: Icon, val, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-dim)]">
                      <Icon className="w-3.5 h-3.5 text-primary/60" />
                      <span className="text-[var(--color-text-secondary)]">{val}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -bottom-5 -left-5 glass-panel-elevated px-4 py-3 flex items-center gap-2.5 animate-float z-10">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                  <Coins className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold">+8.5 XLM</div>
                  <div className="text-[9px] font-mono text-[var(--color-text-dim)]">دعم مباشر</div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 glass-panel-elevated px-3 py-2 animate-float z-10" style={{ animationDelay: '1.5s' }}>
                <div className="text-[9px] font-mono text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" /> محفوظ على السلسلة
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 rounded-3xl -z-10 animate-glowPulse"
            style={{ background: 'radial-gradient(ellipse, var(--color-primary-glow) 0%, var(--color-accent-glow) 50%, transparent 80%)', filter: 'blur(50px)' }} />
          <div className="relative p-14 rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, var(--color-bg-elevated) 50%, color-mix(in srgb, var(--color-accent) 6%, transparent) 100%)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)',
            }}>
            {/* Decorative top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 55%, transparent), color-mix(in srgb, var(--color-accent) 45%, transparent), transparent)' }} />

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                boxShadow: '0 8px 40px var(--color-primary-glow), 0 16px 60px var(--color-accent-glow)',
              }}>
              <Gem className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-[44px] font-serif tracking-[-1.5px] mb-4 leading-tight">
              جاهز تمتلك محتواك؟
            </h2>
            <p className="text-[16px] text-[var(--color-text-dim)] leading-[1.75] mb-8 max-w-lg mx-auto">
              انضم إلى مئات الكتّاب والمبدعين الذين يبنون مستقبلهم الرقمي على Stellar.
              ابدأ مجاناً — ما تحتاجه فقط محفظة Freighter.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/write" className="btn-accent flex items-center gap-2 group text-[13px]">
                ابدأ الكتابة الآن
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/channels" className="btn-outline flex items-center gap-2 text-[13px]">
                <Hash className="w-4 h-4" /> انضم للمجتمع
              </Link>
            </div>
            <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-6 uppercase tracking-wider">
              ⚡ مدعوم بعقود Soroban الذكية على Stellar Testnet
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
