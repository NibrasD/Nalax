import { useWallet } from '../store/useWallet';
import { useAppStore, Article } from '../store/useAppStore';
import { useToast } from '../store/useToast';
import { formatAddress, addressGradient } from '../lib/utils';
import { registerAuthor, fetchAuthorProfile, fetchAuthorArticlesFromChain } from '../lib/stellar';
import { stroopsToXlm } from '../lib/contract';
import { Wallet, TrendingUp, FileText, ArrowUpRight, Shield, Coins, UserPlus, Eye, Heart, Hash, Loader2, RefreshCw } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback }  from 'react';
import { useTranslation } from 'react-i18next';

export function Dashboard() {
  const { t } = useTranslation();
  const { isConnected, publicKey, balance } = useWallet();
  const localArticles = useAppStore(state => state.articles);
  const registeredAuthor = useAppStore(state => state.registeredAuthor);
  const setRegisteredAuthor = useAppStore(state => state.setRegisteredAuthor);
  const toast = useToast();

  const [showRegister, setShowRegister] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [chainArticles, setChainArticles] = useState<Article[]>([]);
  const [chainLoading, setChainLoading] = useState(true);
  const [chainTotalEarned, setChainTotalEarned] = useState<number | null>(null);

  const syncFromChain = useCallback(async () => {
    if (!publicKey) return;
    setChainLoading(true);
    try {
      const profile = await fetchAuthorProfile(publicKey);
      if (profile) {
        const earned = stroopsToXlm(Number(profile.total_earned || 0));
        setChainTotalEarned(earned);

        if (!registeredAuthor) {
          setRegisteredAuthor({
            address: publicKey,
            name: String(profile.name || ''),
            bio: String(profile.bio || ''),
            articleCount: Number(profile.article_count || 0),
            totalEarned: earned,
            registeredAt: Number(profile.registered_at || 0) * 1000,
          });
        }
      }

      const onChainArticles = await fetchAuthorArticlesFromChain(publicKey);
      setChainArticles(onChainArticles as Article[]);
    } catch (e) {
      console.error('Failed to sync dashboard from chain:', e);
    } finally {
      setChainLoading(false);
    }
  }, [publicKey, registeredAuthor, setRegisteredAuthor]);

  useEffect(() => {
    syncFromChain();
  }, [syncFromChain]);

  if (!isConnected) {
    return <Navigate to="/" />;
  }

  const myArticles = (() => {
    const byToken = new Map<number, Article>();
    for (const a of chainArticles) {
      if (a.tokenId) byToken.set(a.tokenId, a);
    }
    const myLocal = localArticles.filter(a => a.authorPublicKey === publicKey);
    for (const a of myLocal) {
      if (a.tokenId && byToken.has(a.tokenId)) {
        const chain = byToken.get(a.tokenId)!;
        byToken.set(a.tokenId, {
          ...a,
          totalRaised: chain.totalRaised,
          accessCount: chain.accessCount,
          tipCount: chain.tipCount,
        });
      } else {
        byToken.set(a.tokenId || Math.random(), a);
      }
    }
    return Array.from(byToken.values()).sort((a, b) => b.createdAt - a.createdAt);
  })();

  const totalRevenue = chainTotalEarned !== null
    ? chainTotalEarned
    : myArticles.reduce((acc, curr) => acc + (curr.totalRaised || 0), 0);
  const totalTips = myArticles.reduce((acc, curr) => acc + (curr.tipCount || 0), 0);
  const totalReaders = myArticles.reduce((acc, curr) => acc + (curr.accessCount || 0), 0);

  const handleRegister = async () => {
    if (!publicKey || !authorName.trim()) return;
    setIsRegistering(true);
    const loadingId = toast.addToast({
      type: 'loading',
      title: t('dashboard.toast.registering_title'),
      message: t('dashboard.toast.registering_msg'),
    });

    try {
      await registerAuthor(publicKey, authorName.trim(), authorBio.trim());
      
      setRegisteredAuthor({
        address: publicKey,
        name: authorName.trim(),
        bio: authorBio.trim(),
        articleCount: myArticles.length,
        totalEarned: totalRevenue,
        registeredAt: Date.now(),
      });
      
      toast.updateToast(loadingId, {
        type: 'success',
        title: t('dashboard.toast.success_title'),
        message: t('dashboard.toast.success_msg'),
      });
      setShowRegister(false);
    } catch (e: any) {
      toast.updateToast(loadingId, {
        type: 'error',
        title: t('dashboard.toast.error_title'),
        message: e?.message || t('dashboard.toast.error_default'),
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const STATS = [
    { label: t('dashboard.stats.revenue'), value: `${totalRevenue.toLocaleString()} XLM`, icon: Coins, color: 'primary' },
    { label: t('dashboard.stats.published'), value: myArticles.length.toString(), icon: FileText, color: 'accent' },
    { label: t('dashboard.stats.readers'), value: totalReaders.toLocaleString(), icon: Eye, color: 'primary' },
    { label: t('dashboard.stats.tips'), value: totalTips.toString(), icon: Heart, color: 'accent' },
  ];

  const TABLE_HEADERS = [
    t('dashboard.table.title'),
    t('dashboard.table.type'),
    t('dashboard.table.status'),
    t('dashboard.table.revenue'),
    t('dashboard.table.readers'),
    t('dashboard.table.tips'),
    '',
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 border-b border-[var(--color-border)] pb-6">
        <div>
          <span className="eyebrow">{t('dashboard.eyebrow')}</span>
          <h1 className="font-serif text-[40px] tracking-[-1px] leading-[1.1]">{t('dashboard.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={syncFromChain}
            disabled={chainLoading}
            className="btn-outline flex items-center gap-2 !py-2.5 !px-4 text-[11px] disabled:opacity-50"
            title={t('dashboard.sync_title')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${chainLoading ? 'animate-spin' : ''}`} />
            {chainLoading ? t('dashboard.syncing') : t('dashboard.sync_btn')}
          </button>
          {!registeredAuthor && (
            <button 
              onClick={() => setShowRegister(true)}
              className="btn-outline flex items-center gap-2 !py-2.5 !px-5 text-[11px]"
            >
              <UserPlus className="w-4 h-4" /> {t('dashboard.register_btn')}
            </button>
          )}
          <Link to="/write" className="btn-primary flex items-center gap-2 !py-2.5 !px-5 text-[11px]">
            <FileText className="w-4 h-4" /> {t('dashboard.new_entry_btn')}
          </Link>
        </div>
      </div>

      {/* Author Identity Card */}
      <div className="glass-panel p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full shrink-0 relative" style={{ background: addressGradient(publicKey || '') }}>
            {registeredAuthor && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center border-2 border-[var(--color-surface)]">
                <Shield className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
          <div>
            <div className="text-[18px] font-serif">{registeredAuthor?.name || formatAddress(publicKey)}</div>
            <div className="text-[11px] font-mono text-primary">{formatAddress(publicKey)}</div>
            {registeredAuthor ? (
              <div className="text-[10px] font-mono text-accent uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <Shield className="w-3 h-3" /> {t('dashboard.on_chain_verified')}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                {t('dashboard.not_registered')}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-sm">
          <Wallet className="w-4 h-4 text-accent" />
          <span className="text-[14px] font-mono text-accent font-medium">{balance} XLM</span>
          <span className="label-sm ml-1">Testnet</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
              color === 'accent' ? 'bg-accent/10 border border-accent/20' : 'bg-primary/10 border border-primary/20'
            }`}>
              <Icon className={`w-4 h-4 ${color === 'accent' ? 'text-accent' : 'text-primary'}`} />
            </div>
            <div className="text-[24px] font-serif tracking-tight">{value}</div>
            <div className="label-sm mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Articles Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[20px] font-serif">{t('dashboard.content_nfts_title')}</h2>
        <span className="label-sm">{t('dashboard.entries_count', { count: myArticles.length })}</span>
      </div>
      
      <div className="glass-panel overflow-hidden">
        {myArticles.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[14px] text-[var(--color-text-dim)] mb-3">{t('dashboard.empty_message')}</p>
            <Link to="/write" className="text-primary hover:text-white transition-colors text-[12px] font-mono uppercase tracking-wider">
              {t('dashboard.start_writing')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                  {TABLE_HEADERS.map((h, i) => (
                    <th key={i} className="px-5 py-3 label-sm font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myArticles.map(article => (
                  <tr key={article.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors group">
                    <td className="px-5 py-4 font-serif text-[16px] max-w-[220px] truncate">{article.title}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-sm ${
                        article.isTokenGated 
                          ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' 
                          : 'bg-accent/10 text-accent'
                      }`}>
                        {article.isTokenGated ? t('dashboard.type_gated') : t('dashboard.type_free')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          article.status === 'minted' ? 'bg-accent' : 
                          article.status === 'minting' ? 'bg-[var(--color-warning)] animate-pulse' : 
                          'bg-[var(--color-error)]'
                        }`} />
                        {article.status || 'minted'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px] text-accent">{(article.totalRaised || 0).toLocaleString()} XLM</td>
                    <td className="px-5 py-4 font-mono text-[12px] text-[var(--color-text-dim)]">{article.accessCount || 0}</td>
                    <td className="px-5 py-4 font-mono text-[12px] text-[var(--color-text-dim)]">{article.tipCount || 0}</td>
                    <td className="px-5 py-4 text-right">
                      <Link 
                        to={`/article/${article.id}`} 
                        className="text-[11px] uppercase font-mono tracking-wider text-[var(--color-text-dim)] hover:text-white inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {t('dashboard.table.view')} <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRegister(false)} />
          <div className="relative glass-panel-elevated w-full max-w-md p-8 animate-slideUp">
            <h3 className="text-xl font-serif mb-1">{t('dashboard.register_modal.title')}</h3>
            <p className="text-[13px] text-[var(--color-text-dim)] mb-6 leading-relaxed">
              {t('dashboard.register_modal.subtitle')}
            </p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="label-sm mb-2 block">{t('dashboard.register_modal.name_label')}</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={t('dashboard.register_modal.name_placeholder')}
                  className="input-field"
                  maxLength={64}
                />
              </div>
              <div>
                <label className="label-sm mb-2 block">{t('dashboard.register_modal.bio_label')}</label>
                <textarea
                  value={authorBio}
                  onChange={(e) => setAuthorBio(e.target.value)}
                  placeholder={t('dashboard.register_modal.bio_placeholder')}
                  className="input-field resize-none"
                  rows={3}
                  maxLength={256}
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setShowRegister(false)} className="btn-outline flex-1">
                {t('dashboard.register_modal.cancel_btn')}
              </button>
              <button 
                onClick={handleRegister}
                disabled={isRegistering || !authorName.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-30"
              >
                {isRegistering ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('dashboard.register_modal.registering')}</>
                ) : (
                  <><Shield className="w-4 h-4" /> {t('dashboard.register_modal.register_btn')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
