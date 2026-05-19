import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Hash, Search, TrendingUp, Users, Plus, Zap, Compass } from 'lucide-react';
import { ChannelCard } from '../components/ChannelCard';
import { useChannelStore } from '../store/useChannelStore';
import { useWallet } from '../store/useWallet';

type SortType = 'popular' | 'newest' | 'active';

const SORT_OPTIONS: { value: SortType; label: string; icon: React.ElementType }[] = [
  { value: 'popular', label: 'الأكثر متابعة', icon: TrendingUp },
  { value: 'newest',  label: 'الأحدث',        icon: Zap },
  { value: 'active',  label: 'الأكثر نشاطاً', icon: Compass },
];

export function Channels() {
  const { channels, joinedChannelIds } = useChannelStore();
  const { isConnected } = useWallet();

  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState<SortType>('popular');
  const [tab, setTab]         = useState<'all' | 'joined'>('all');

  const filtered = useMemo(() => {
    let list = tab === 'joined'
      ? channels.filter((c) => joinedChannelIds.includes(c.id))
      : channels;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    const sorted = [...list];
    if (sort === 'popular') sorted.sort((a, b) => b.memberCount - a.memberCount);
    if (sort === 'newest')  sorted.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === 'active')  sorted.sort((a, b) => b.postCount - a.postCount);
    return sorted;
  }, [channels, joinedChannelIds, search, sort, tab]);

  // Aggregate totals for the stats banner
  const totalMembers = channels.reduce((s, c) => s + c.memberCount, 0);
  const totalPosts   = channels.reduce((s, c) => s + c.postCount, 0);

  return (
    <div className="max-w-6xl mx-auto py-8 animate-fadeIn">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <span className="eyebrow flex items-center gap-2">
              <Hash className="w-3.5 h-3.5" /> القنوات
            </span>
            <h1 className="text-[48px] font-serif tracking-[-1.5px] leading-[1.05]">
              استكشف <span className="text-gradient">المجتمعات</span>
            </h1>
            <p className="text-[15px] text-[var(--color-text-dim)] mt-2 max-w-lg leading-relaxed">
              انضم إلى قنوات متخصصة ناقش فيها Stellar، Web3، والمحتوى الرقمي مع المجتمع العربي.
            </p>
          </div>

          {isConnected && (
            <Link
              to="/channels/create"
              className="btn-primary flex items-center gap-2 self-start whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> إنشاء قناة
            </Link>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'قناة',     value: channels.length,                   color: 'text-primary' },
            { label: 'عضو',      value: totalMembers.toLocaleString(),      color: 'text-accent' },
            { label: 'منشور',    value: totalPosts.toLocaleString(),         color: 'text-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-panel p-4 text-center">
              <div className={`text-[26px] font-serif font-bold ${color}`}>{value}</div>
              <div className="text-[11px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Controls row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-dim)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن قناة أو وسم..."
              className="input-field pl-11 rtl:pl-4 rtl:pr-11 !rounded-sm w-full"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-1 shrink-0">
            {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono uppercase tracking-[1px] cursor-pointer rounded-sm transition-all ${
                  sort === value
                    ? 'bg-primary text-white'
                    : 'text-[var(--color-text-dim)] hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] w-fit">
        {[
          { id: 'all',    label: 'كل القنوات', icon: Hash },
          { id: 'joined', label: 'قنواتي',     icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as 'all' | 'joined')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
              tab === id
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] shadow-sm border border-[var(--color-border)]'
                : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'joined' && joinedChannelIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono">
                {joinedChannelIds.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Results count ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <span className="label-sm">{filtered.length} قناة</span>
        {(search || tab === 'joined') && (
          <button
            onClick={() => { setSearch(''); setTab('all'); }}
            className="text-[10px] font-mono uppercase tracking-wider text-primary hover:text-white transition-colors cursor-pointer"
          >
            مسح الفلاتر ×
          </button>
        )}
      </div>

      {/* ── Channel Grid ─────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((channel, i) => (
            <ChannelCard key={channel.id} channel={channel} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
            <Hash className="w-7 h-7 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-xl font-serif mb-2 text-[var(--color-text-secondary)]">
            {tab === 'joined' ? 'لم تنضم إلى أي قناة بعد' : 'لا توجد قنوات مطابقة'}
          </h3>
          <p className="text-[13px] text-[var(--color-text-dim)] font-mono mb-6">
            {tab === 'joined'
              ? 'استعرض القنوات المتاحة وانضم إلى ما يهمك'
              : search
              ? `لا توجد نتائج لـ "${search}"`
              : 'كن أول من ينشئ قناة!'}
          </p>
          {tab === 'joined' ? (
            <button
              onClick={() => setTab('all')}
              className="btn-primary text-[13px] px-6 py-2.5"
            >
              استعرض كل القنوات
            </button>
          ) : isConnected ? (
            <Link to="/channels/create" className="btn-primary text-[13px] px-6 py-2.5 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> إنشاء قناة جديدة
            </Link>
          ) : null}
        </div>
      )}

      {/* ── Create CTA (bottom, only when not connected) ─────────────── */}
      {!isConnected && (
        <div className="mt-12 relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10" />
          <div className="relative z-10 text-center py-12 px-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Hash className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-[24px] font-serif mb-2">أنشئ مجتمعك الخاص</h3>
            <p className="text-[14px] text-[var(--color-text-dim)] max-w-sm mx-auto mb-6 leading-relaxed">
              ربط محفظتك لإنشاء قنواتك الخاصة وبناء مجتمع حول اهتماماتك.
            </p>
            <span className="text-[12px] font-mono text-primary/60 uppercase tracking-wider border border-primary/20 px-4 py-2 rounded-full">
              ربط المحفظة مطلوب
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
