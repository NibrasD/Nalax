import { useAppStore, Article } from '../store/useAppStore';
import { ArticleCard } from '../components/ArticleCard';
import { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchAllArticlesFromChain } from '../lib/stellar';
import { preloadIPFSContent } from '../lib/ipfs';

type FilterType = 'all' | 'free' | 'gated' | 'crowdfund';

export function Explore() {
  const { t } = useTranslation();
  const localArticles = useAppStore(state => state.articles);
  
  const FILTERS: { value: FilterType; label: string }[] = [
    { value: 'all', label: t('explore.filters.all') },
    { value: 'free', label: t('explore.filters.free') },
    { value: 'gated', label: t('explore.filters.gated') },
    { value: 'crowdfund', label: t('explore.filters.crowdfund') },
  ];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [chainArticles, setChainArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Load articles from on-chain on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const onChain = await fetchAllArticlesFromChain();
        if (!cancelled) {
          setChainArticles(onChain as Article[]);
          // Preload IPFS content in the background for faster article loading
          const cids = onChain
            .map((a: any) => a.contentHash)
            .filter((cid: string) => cid && cid.length > 0);
          preloadIPFSContent(cids);
        }
      } catch (e) {
        console.error('Failed to fetch on-chain articles:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Merge local + on-chain articles, deduplicate by tokenId
  const allArticles = (() => {
    const byToken = new Map<number, Article>();
    // On-chain first (lower priority for content, since it's empty)
    for (const a of chainArticles) {
      if (a.tokenId) byToken.set(a.tokenId, a);
    }
    // Local articles override (they have full content text)
    for (const a of localArticles) {
      if (a.tokenId && byToken.has(a.tokenId)) {
        // Merge: keep local content but update on-chain stats
        const chain = byToken.get(a.tokenId)!;
        byToken.set(a.tokenId, { ...a, accessCount: chain.accessCount, tipCount: chain.tipCount, totalRaised: chain.totalRaised });
      } else {
        byToken.set(a.tokenId || Math.random(), a);
      }
    }
    // Also add on-chain articles that aren't in local yet
    return Array.from(byToken.values()).sort((a, b) => b.createdAt - a.createdAt);
  })();

  const filteredArticles = allArticles.filter(article => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch = 
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        (article.authorName || '').toLowerCase().includes(q) ||
        (article.tags || []).some(t => t.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    
    // Type filter
    if (filter === 'free') return !article.isTokenGated && !article.crowdfundingGoal;
    if (filter === 'gated') return article.isTokenGated;
    if (filter === 'crowdfund') return !!article.crowdfundingGoal;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-10">
        <span className="eyebrow">{t('explore.eyebrow')}</span>
        <h1 className="text-[48px] font-serif tracking-[-1.5px] leading-[1.05] mb-6">
          {t('explore.title').split('*')[0]}<span className="text-gradient">{t('explore.title').split('*')[1]}</span>{t('explore.title').split('*')[2]}
        </h1>
        
        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-dim)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('explore.search_placeholder')}
              className="input-field pl-11 rtl:pl-4 rtl:pr-11 !rounded-sm"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-1">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 text-[10px] font-mono uppercase tracking-[1.5px] cursor-pointer rounded-sm transition-all ${
                  filter === value
                    ? 'bg-primary text-white'
                    : 'text-[var(--color-text-dim)] hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-6">
        <span className="label-sm">
          {filteredArticles.length === 1 
            ? t('explore.results', { count: filteredArticles.length }) 
            : t('explore.results_plural', { count: filteredArticles.length })}
        </span>
        {filter !== 'all' && (
          <button 
            onClick={() => { setFilter('all'); setSearch(''); }}
            className="text-[10px] font-mono uppercase tracking-wider text-primary hover:text-white transition-colors cursor-pointer"
          >
            {t('explore.clear_filters')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="glass-panel p-16 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-serif mb-2">{t('explore.loading.title')}</h3>
          <p className="text-[13px] text-[var(--color-text-dim)] font-mono">
            {t('explore.loading.subtitle')}
          </p>
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-xl font-serif mb-2 text-[var(--color-text-secondary)]">{t('explore.no_results.title')}</h3>
          <p className="text-[13px] text-[var(--color-text-dim)] font-mono">
            {search ? t('explore.no_results.no_results_for', { search }) : t('explore.no_results.no_match')}
          </p>
        </div>
      )}
    </div>
  );
}
