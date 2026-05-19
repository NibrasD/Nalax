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
import { purchaseAccess, tipAuthor, fetchContentById, checkAccess } from '../lib/stellar';
import { xlmToStroops } from '../lib/contract';
import { fetchIPFSContent } from '../lib/ipfs';

const TIP_PRESETS = [1, 5, 10, 25];

export function Article() {
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

  // If not found locally, try fetching from chain
  useEffect(() => {
    if (localArticle) return; // Already have it locally
    if (!id) return;
    
    // Extract tokenId from URL (could be "onchain-1" or just "1")
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
        
        // Fetch content from IPFS using cached fetcher
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

  // Merge: prefer local article, fall back to chain
  const article = localArticle || chainArticle;

  // ── On-chain access check (fixes: access verification via contract, not local state) ──
  useEffect(() => {
    if (!publicKey || !article?.tokenId || !article.isTokenGated) return;
    let cancelled = false;
    checkAccess(publicKey, article.tokenId).then(hasIt => {
      if (!cancelled) setHasUnlocked(hasIt);
    });
    return () => { cancelled = true; };
  }, [publicKey, article?.tokenId, article?.isTokenGated]);
  
  // Use IPFS content if the local content is empty
  const displayContent = (article?.content && article.content.length > 0) 
    ? article.content 
    : ipfsContent || '';
    
  if (loading) {
    return (
      <div className="text-center py-24 animate-fadeIn">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-serif mb-2">Loading from Stellar...</h2>
        <p className="text-[var(--color-text-dim)] text-sm font-mono">Fetching on-chain metadata & IPFS content</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-24 animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
          <FileText className="w-7 h-7 text-[var(--color-text-muted)]" />
        </div>
        <h2 className="text-2xl font-serif mb-2">Article Not Found</h2>
        <p className="text-[var(--color-text-dim)] text-sm font-mono">This content may have been removed or doesn't exist.</p>
      </div>
    );
  }

  const handleTransaction = async (type: 'unlock' | 'tip') => {
    if (!isConnected || !publicKey) {
      toast.addToast({ type: 'error', title: 'Wallet Required', message: 'Please connect your Freighter wallet first.' });
      return;
    }

    if (!article.tokenId) {
      toast.addToast({ type: 'error', title: 'Missing Token ID', message: 'This article has no on-chain token ID.' });
      return;
    }
    
    setIsTransacting(true);
    const loadingId = toast.addToast({ 
      type: 'loading', 
      title: type === 'unlock' ? 'Unlocking Content...' : 'Sending Tip...',
      message: 'Waiting for wallet confirmation'
    });

    try {
      let result: any;

      if (type === 'unlock') {
        // ── FIX: Call purchase_access on the smart contract (not direct payment) ──
        result = await purchaseAccess(publicKey, article.tokenId);
        setHasUnlocked(true);
        fundArticle(article.id, article.price || 0);
        toast.updateToast(loadingId, { 
          type: 'success', 
          title: 'Content Unlocked!', 
          message: `TX: ${result?.hash?.slice(0, 16)}...` 
        });
      } else {
        // ── FIX: Call tip_author on the smart contract (not direct payment) ──
        const tipStroops = xlmToStroops(Number(tipAmount));
        result = await tipAuthor(publicKey, article.tokenId, tipStroops);
        tipArticle(article.id, Number(tipAmount));
        setTipAmount('');
        toast.updateToast(loadingId, { 
          type: 'success', 
          title: 'Tip Sent!', 
          message: `${tipAmount} XLM sent to author via contract` 
        });
      }
    } catch (error: any) {
      console.error(error);
      toast.updateToast(loadingId, { 
        type: 'error', 
        title: 'Transaction Failed', 
        message: error?.message || 'Unknown error' 
      });
    } finally {
      setIsTransacting(false);
      // Refresh balance after any transaction attempt
      refreshBalance();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.addToast({ type: 'info', title: 'Link Copied', duration: 2000 });
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
              <Lock className="w-3 h-3" /> Token-Gated
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
              <div className="text-[14px] font-medium">{article.authorName || formatAddress(article.authorPublicKey)}</div>
              <div className="text-[10px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-accent" />
                On-Chain Verified Author
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
              {article.accessCount || 0} readers
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-accent" />
              {article.tipCount || 0} tips
            </div>
            <button onClick={copyLink} className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Share'}
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
            <h3 className="text-2xl font-serif mb-2">Token-Gated Content</h3>
            <p className="text-[var(--color-text-dim)] max-w-sm mx-auto leading-relaxed text-[14px] mb-6">
              This article is secured by a Soroban smart contract. Purchase access to read the full story and support the author.
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
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming...</>
              ) : (
                <><Lock className="w-4 h-4" /> Unlock for {article.price} XLM</>
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
            {/* Tip Card */}
            <div className="glass-panel p-5">
              <h4 className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-4 flex items-center justify-between">
                Support Author
                <Coins className="w-4 h-4 text-primary" />
              </h4>
              
              <div className="grid grid-cols-4 gap-2 mb-3">
                {TIP_PRESETS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setTipAmount(amount.toString())}
                    className={`py-2 text-[12px] font-mono cursor-pointer transition-all rounded-sm ${
                      tipAmount === amount.toString()
                        ? 'bg-primary text-white border border-primary'
                        : 'bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-white hover:border-[var(--color-border-bright)]'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="XLM"
                  className="input-field !py-2 flex-1"
                />
                <button 
                  onClick={() => handleTransaction('tip')}
                  disabled={isTransacting || !tipAmount || Number(tipAmount) <= 0}
                  className="btn-primary !py-2 !px-4 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isTransacting ? '...' : 'Tip'}
                </button>
              </div>
              <p className="text-[10px] text-[var(--color-text-dim)] mt-2 leading-relaxed">
                Tips are sent directly to the author via Stellar. Zero fees.
              </p>
            </div>

            {/* On-chain verification */}
            <div className="glass-panel p-5">
              <h4 className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-4 flex items-center justify-between">
                On-Chain Data
                <ShieldCheck className="w-4 h-4 text-accent" />
              </h4>
              
              <div className="space-y-3">
                <div>
                  <div className="label-sm mb-1">Network</div>
                  <div className="text-[12px] font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Soroban (Testnet)
                  </div>
                </div>
                
                {article.contentHash && (
                  <div>
                    <div className="label-sm mb-1">Content Hash</div>
                    <div className="text-[11px] font-mono text-primary break-all bg-[var(--color-bg-base)] p-2 border border-[var(--color-border)] rounded-sm">
                      {article.contentHash.slice(0, 32)}...
                    </div>
                  </div>
                )}
                
                {article.txHash && (
                  <div>
                    <div className="label-sm mb-1">TX Hash</div>
                    <div className="text-[11px] font-mono text-accent break-all">
                      {article.txHash.slice(0, 20)}...
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-dim)]">Total Raised</span>
                    <span className="font-mono text-accent">{(article.totalRaised || 0).toLocaleString()} XLM</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-dim)]">Access Count</span>
                    <span className="font-mono">{article.accessCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-dim)]">Tips Received</span>
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
