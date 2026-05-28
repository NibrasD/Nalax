import { useParams } from 'react-router-dom';
import { useAppStore, Article as ArticleType } from '../store/useAppStore';
import { useWallet } from '../store/useWallet';
import { useToast } from '../store/useToast';
import { formatAddress, addressGradient, readingTime } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lock, FileText, ExternalLink, ShieldCheck, Coins, Heart, Copy, Check, Clock, Eye, Hash, Users, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { purchaseAccess, tipAuthor, fetchContentById, checkAccess, fetchAuthorProfile } from '../lib/stellar';
import { xlmToStroops } from '../lib/contract';
import { fetchIPFSContent } from '../lib/ipfs';
import { useTranslation } from 'react-i18next';
import { generatePaymentPointer } from '../lib/ilp';
import { WebMonetizationMiniApp } from '../components/miniapps/WebMonetizationMiniApp';
import { TipJarMiniApp } from '../components/miniapps/TipJarMiniApp';

export function Article() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const localArticle = useAppStore(state => state.articles.find(a => a.id === id));
  const fundArticle = useAppStore(state => state.fundArticle);
  const tipArticle = useAppStore(state => state.tipArticle);
  const { isConnected, publicKey, refreshBalance } = useWallet();
  const toast = useToast();
  
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [tipAmount, setTipAmount] = useState('5');
  const [copied, setCopied] = useState(false);
  
  // On-chain article loading
  const [chainArticle, setChainArticle] = useState<ArticleType | null>(null);
  const [ipfsContent, setIpfsContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authorDisplayName, setAuthorDisplayName] = useState<string | null>(null);

  // If not found locally, try fetching from chain
  useEffect(() => {
    if (localArticle) return;
    if (!id) return;
    
    const tokenIdStr = id.startsWith('onchain-') ? id.replace('onchain-', '') : id;
    const tokenId = parseInt(tokenIdStr, 10);
    if (isNaN(tokenId)) return;
    
    setLoading(true);
    (async () => {
      try {
        const content = await fetchContentById(tokenId);
        if (!content) { setLoading(false); return; }
        
        const art: ArticleType = {
          id: id,
          tokenId: Number(content.token_id),
          title: String(content.title || ''),
          excerpt: String(content.excerpt || ''),
          content: '',
          authorPublicKey: String(content.author || ''),
          createdAt: Number(content.created_at) * 1000,
          contentHash: String(content.content_hash || ''),
          isTokenGated: Boolean(content.is_token_gated),
          price: Number(content.access_price) / 10_000_000,
          totalRaised: Number(content.total_raised) / 10_000_000,
          accessCount: Number(content.access_count),
          tipCount: Number(content.tip_count),
          status: 'minted',
          tags: [],
          readTime: '3 min read',
        };
        setChainArticle(art);
        
        const cid = art.contentHash;
        if (cid) {
          const ipfsText = await fetchIPFSContent(cid);
          if (ipfsText) {
            setIpfsContent(ipfsText);
          }
        }
      } catch (e) {
        console.error('Failed to fetch on-chain article:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, localArticle]);

  const article = localArticle || chainArticle;

  // Fetch author display name from on-chain profile
  useEffect(() => {
    if (!article?.authorPublicKey) return;
    // If we already have a name from the article, use it
    if (article.authorName) {
      setAuthorDisplayName(article.authorName);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchAuthorProfile(article.authorPublicKey);
        if (!cancelled && profile?.name) {
          setAuthorDisplayName(String(profile.name));
        }
      } catch (e) {
        // Silently fail — will fall back to formatAddress
      }
    })();
    return () => { cancelled = true; };
  }, [article?.authorPublicKey, article?.authorName]);

  useEffect(() => {
    if (!publicKey || !article?.tokenId || !article.isTokenGated) return;
    let cancelled = false;
    checkAccess(publicKey, article.tokenId).then(hasIt => {
      if (!cancelled) setHasUnlocked(hasIt);
    });
    return () => { cancelled = true; };
  }, [publicKey, article?.tokenId, article?.isTokenGated]);
  
  const displayContent = (article?.content && article.content.length > 0) 
    ? article.content 
    : ipfsContent || '';
    
  if (loading) {
    return (
      <div className="text-center py-24 animate-fadeIn">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-serif mb-2">{t('article.loading_title')}</h2>
        <p className="text-[var(--color-text-dim)] text-sm font-mono">{t('article.loading_subtitle')}</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-24 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
          <FileText className="w-7 h-7 text-[var(--color-text-muted)]" />
        </div>
        <h2 className="text-2xl font-serif mb-2">{t('article.not_found_title')}</h2>
        <p className="text-[var(--color-text-dim)] text-sm font-mono">{t('article.not_found_subtitle')}</p>
      </div>
    );
  }

  const handleTransaction = async (type: 'unlock' | 'tip') => {
    if (!isConnected || !publicKey) {
      toast.addToast({ type: 'error', title: t('toast.wallet_required_title'), message: t('toast.wallet_required_msg') });
      return;
    }

    if (!article.tokenId) {
      toast.addToast({ type: 'error', title: t('toast.missing_token_title'), message: t('toast.missing_token_msg') });
      return;
    }
    
    setIsTransacting(true);
    const loadingId = toast.addToast({ 
      type: 'loading', 
      title: type === 'unlock' ? t('toast.unlocking') : t('toast.sending_tip'),
      message: t('toast.waiting_confirm')
    });

    try {
      let result: any;

      if (type === 'unlock') {
        result = await purchaseAccess(publicKey, article.tokenId);
        setHasUnlocked(true);
        fundArticle(article.id, article.price || 0);
        toast.updateToast(loadingId, { 
          type: 'success', 
          title: t('toast.unlocked_title'), 
          message: `TX: ${result?.hash?.slice(0, 16)}...` 
        });
      } else {
        const tipStroops = xlmToStroops(Number(tipAmount));
        result = await tipAuthor(publicKey, article.tokenId, tipStroops);
        tipArticle(article.id, Number(tipAmount));
        setTipAmount('');
        toast.updateToast(loadingId, { 
          type: 'success', 
          title: t('toast.tip_sent_title'), 
          message: t('toast.tip_sent_msg', { amount: tipAmount })
        });
      }
    } catch (error: any) {
      console.error(error);
      toast.updateToast(loadingId, { 
        type: 'error', 
        title: t('toast.tx_failed_title'), 
        message: error?.message || 'Unknown error' 
      });
    } finally {
      setIsTransacting(false);
      refreshBalance();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.addToast({ type: 'info', title: t('toast.link_copied_title'), duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const isAuthor = publicKey === article.authorPublicKey;
  const showContent = !article.isTokenGated || hasUnlocked || isAuthor;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fadeIn">
      {/* Header */}
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          {article.tags?.map(tag => (
            <span key={tag} className="text-[10px] font-mono uppercase tracking-[1.5px] text-primary bg-primary/10 px-2.5 py-1 rounded-sm">
              {tag}
            </span>
          ))}
          {article.isTokenGated && (
            <span className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2.5 py-1 rounded-sm flex items-center gap-1">
              <Lock className="w-3 h-3" /> {t('article.token_gated_badge')}
            </span>
          )}
        </div>
        
        <h1 className="font-serif text-[42px] md:text-[56px] leading-[1.06] font-normal tracking-[-2px] mb-6">
          {article.title}
        </h1>
        
        <p className="text-[17px] text-[var(--color-text-dim)] leading-relaxed mb-8 max-w-2xl">
          {article.excerpt}
        </p>
        
        {/* Author & Meta bar */}
        <div className="flex flex-wrap items-center justify-between gap-6 py-5 border-y border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full shrink-0" style={{ background: addressGradient(article.authorPublicKey) }} />
            <div>
              <div className="text-[14px] font-medium">{authorDisplayName || article.authorName || formatAddress(article.authorPublicKey)}</div>
              <div className="text-[10px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-accent" />
                {t('article.on_chain_verified')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5 text-[11px] font-mono text-[var(--color-text-dim)] uppercase">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatDistanceToNow(article.createdAt, { addSuffix: true })}
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {article.accessCount || 0} {t('article.readers')}
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-accent" />
              {article.tipCount || 0} {t('article.tips')}
            </div>
            <button onClick={copyLink} className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('article.copied') : t('article.share')}
            </button>
          </div>
        </div>
      </header>

      {/* Content or Gate */}
      {!showContent ? (
        <div className="glass-panel p-12 text-center space-y-6 my-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-serif mb-2">{t('article.gate.title')}</h3>
            <p className="text-[var(--color-text-dim)] max-w-sm mx-auto leading-relaxed text-[14px] mb-6">
              {t('article.gate.description')}
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-[32px] font-serif text-primary">{article.price}</div>
                <div className="label-sm">XLM</div>
              </div>
            </div>
            <button 
              onClick={() => handleTransaction('unlock')}
              disabled={isTransacting}
              className="btn-primary w-full max-w-xs mx-auto flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isTransacting ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('article.gate.confirming')}</>
              ) : (
                <><Lock className="w-4 h-4" /> {t('article.gate.unlock_btn', { price: article.price })}</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          {/* Article body */}
          <article className="prose prose-invert max-w-none 
            prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-[var(--color-text-secondary)] 
            prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight 
            prose-h1:text-[36px] prose-h2:text-[28px] prose-h3:text-[22px]
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:text-primary prose-code:text-[14px] prose-code:bg-[var(--color-surface)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm
            prose-pre:bg-[var(--color-surface)] prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:rounded-sm
            prose-blockquote:border-l-primary prose-blockquote:text-[var(--color-text-dim)] prose-blockquote:not-italic
            prose-strong:text-white prose-strong:font-semibold
            prose-li:text-[var(--color-text-secondary)] prose-li:text-[16px]
            prose-hr:border-[var(--color-border)]
          ">
            <Markdown remarkPlugins={[remarkGfm]}>{displayContent}</Markdown>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            {/* Web Monetization — Streaming Micropayments */}
            <WebMonetizationMiniApp
              authorPaymentPointer={generatePaymentPointer(article.authorPublicKey)}
              authorName={authorDisplayName || article.authorName || formatAddress(article.authorPublicKey)}
              articleTitle={article.title}
            />

            {/* Cross-chain Tip Jar via InterLedger */}
            <TipJarMiniApp
              recipientName={authorDisplayName || article.authorName || formatAddress(article.authorPublicKey)}
              recipientAddress={article.authorPublicKey}
              tokenId={article.tokenId}
              onTipSuccess={(_txHash, amount) => {
                // Bump the local store so the article card updates instantly;
                // the on-chain values will catch up on the next page load.
                if (article.tokenId) tipArticle(article.id, amount);
              }}
            />

            {/* On-chain verification */}
            <div className="glass-panel p-5">
              <h4 className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-4 flex items-center justify-between">
                {t('article.sidebar.onchain_title')}
                <ShieldCheck className="w-4 h-4 text-accent" />
              </h4>
              
              <div className="space-y-3">
                <div>
                  <div className="label-sm mb-1">{t('article.sidebar.network_label')}</div>
                  <div className="text-[12px] font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {t('article.sidebar.network_val')}
                  </div>
                </div>
                
                {article.contentHash && (
                  <div>
                    <div className="label-sm mb-1">{t('article.sidebar.content_hash_label')}</div>
                    <div className="text-[11px] font-mono text-primary break-all bg-[var(--color-bg-base)] p-2 border border-[var(--color-border)] rounded-sm">
                      {article.contentHash.slice(0, 32)}...
                    </div>
                  </div>
                )}
                
                {article.txHash && (
                  <div>
                    <div className="label-sm mb-1">{t('article.sidebar.tx_hash_label')}</div>
                    <div className="text-[11px] font-mono text-accent break-all">
                      {article.txHash.slice(0, 20)}...
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-dim)]">{t('article.sidebar.total_raised')}</span>
                    <span className="font-mono text-accent">{(article.totalRaised || 0).toLocaleString()} XLM</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-dim)]">{t('article.sidebar.access_count')}</span>
                    <span className="font-mono">{article.accessCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-dim)]">{t('article.sidebar.tips_received')}</span>
                    <span className="font-mono">{article.tipCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
