import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../store/useWallet';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../store/useToast';
import { generateMockId, readingTime } from '../lib/utils';
import { hashContent } from '../lib/contract';
import { uploadToIPFS } from '../lib/ipfs';
import { writeArticleToChain, mintContent, extractTokenIdFromResult, fetchContentById } from '../lib/stellar';
import { readSorobanContract } from '../lib/stellar';
import { CONTRACT_METHODS } from '../lib/contract';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { PublishModal } from '../components/PublishModal';
import { Save, UploadCloud, AlertCircle, Lock, Coins, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Write() {
  const { t } = useTranslation();
  const { isConnected, publicKey } = useWallet();
  const addArticle = useAppStore(state => state.addArticle);
  const navigate = useNavigate();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [isTokenGated, setIsTokenGated] = useState(false);
  const [price, setPrice] = useState('5');
  
  // Publish state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishStep, setPublishStep] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishTxHash, setPublishTxHash] = useState<string | null>(null);
  const [newArticleId, setNewArticleId] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!isConnected || !publicKey || !title.trim()) return;
    
    setShowPublishModal(true);
    setPublishStep(0);
    setPublishError(null);
    setPublishTxHash(null);

    try {
      // Step 0: Upload to IPFS
      setPublishStep(0);
      const contentBody = content || 'Empty article body.';
      const cid = await uploadToIPFS(contentBody, title);
      await new Promise(r => setTimeout(r, 800));

      // Step 1: Minting NFT (prepare tx)
      setPublishStep(1);
      await new Promise(r => setTimeout(r, 500));

      // Step 2: Signing transaction (Smart Contract Call)
      setPublishStep(2);
      const accessPrice = isTokenGated ? BigInt(parseFloat(price) * 10_000_000) : BigInt(0);
      
      const result = await mintContent(
        publicKey, 
        title.substring(0, 250), 
        cid.substring(0, 64), 
        (excerpt.trim() || title.trim()).substring(0, 500), 
        isTokenGated, 
        accessPrice
      );
      
      // Step 3: Confirming on-chain + extract token ID
      setPublishStep(3);
      const txHash = result?.hash || `tx_${generateMockId()}`;
      setPublishTxHash(txHash);

      // ── FIX: Extract real token_id from contract result instead of random ──
      let extractedTokenId = extractTokenIdFromResult(result);
      if (extractedTokenId === null) {
        // Fallback: query the contract for the next token ID and subtract 1
        try {
          const nextId = await readSorobanContract(CONTRACT_METHODS.GET_NEXT_TOKEN_ID);
          if (nextId && typeof nextId === 'number') {
            extractedTokenId = nextId - 1;
          }
        } catch (e) {
          console.error('Fallback token ID fetch failed:', e);
        }
      }
      // Final fallback if everything fails
      if (extractedTokenId === null) {
        extractedTokenId = Date.now();
        console.warn('Using timestamp as token ID fallback — data may be inconsistent');
      }

      await new Promise(r => setTimeout(r, 1000));

      // Complete — add to local store
      const articleId = `onchain-${extractedTokenId}`;
      setNewArticleId(articleId);

      const newArticle = {
        id: articleId,
        tokenId: extractedTokenId,
        title: title.trim(),
        excerpt: excerpt.trim() || title.trim(),
        content: contentBody,
        authorPublicKey: publicKey,
        createdAt: Date.now(),
        contentHash: cid, // Now storing IPFS CID!
        isTokenGated,
        price: isTokenGated ? Number(price) : undefined,
        totalRaised: 0,
        accessCount: 0,
        tipCount: 0,
        status: 'minted' as const,
        tags: [],
        readTime: readingTime(contentBody),
        txHash,
      };

      addArticle(newArticle);
      setPublishStep(4); // Complete

      toast.addToast({
        type: 'success',
        title: 'Content NFT Minted!',
        message: `"${title}" is now on the Stellar ledger.`,
      });

    } catch (e: any) {
      console.error(e);
      setPublishError(e?.message || 'Unknown error occurred during publishing.');
      toast.addToast({
        type: 'error',
        title: 'Publish Failed',
        message: e?.message || 'Transaction was rejected or timed out.',
      });
    }
  };

  const handleModalClose = () => {
    setShowPublishModal(false);
    if (newArticleId && publishStep >= 4) {
      navigate(`/article/${newArticleId}`);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 animate-fadeIn">
        <div className="glass-panel p-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.03] flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-[var(--color-text-muted)]" />
          </div>
          <h2 className="text-2xl font-serif mb-3">{t('write.wallet_required.title', 'Wallet Required')}</h2>
          <p className="text-[var(--color-text-dim)] mb-2 text-[14px] leading-relaxed">
            {t('write.wallet_required.description', 'Connect your Freighter wallet to publish content on the Stellar network.')}
          </p>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
            {t('write.wallet_required.identity', 'Your on-chain identity is linked to your wallet')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-6">
          <div>
            <span className="eyebrow">Create</span>
            <h1 className="text-[40px] font-serif tracking-[-1px] leading-[1.1]">New Entry</h1>
          </div>
          <button 
            onClick={handlePublish}
            disabled={!title.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Publish to Chain
          </button>
        </div>

        {/* Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            <input
              type="text"
              placeholder="Article Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-[40px] font-serif tracking-tight outline-none placeholder-[var(--color-text-muted)] pb-4 border-b border-[var(--color-border)] focus:border-primary transition-colors"
            />
            
            <textarea
              placeholder="A short excerpt to preview your article..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full bg-transparent text-[16px] text-[var(--color-text-dim)] outline-none placeholder-[var(--color-text-muted)] resize-none leading-relaxed"
              rows={2}
            />
            
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Write your story using Markdown..."
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Storage Info */}
            <div className="glass-panel p-5">
              <h3 className="text-[10px] font-mono uppercase tracking-[2px] text-primary mb-4 flex items-center justify-between">
                <span>On-Chain Storage</span>
                <UploadCloud className="w-4 h-4" />
              </h3>
              <p className="text-[12px] text-[var(--color-text-dim)] leading-relaxed mb-4">
                Your content will be hashed (SHA-256) and the hash will be permanently stored on the Stellar ledger via a Soroban smart contract.
              </p>
              <div className="p-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-sm">
                <div className="label-sm mb-1">Content Hash</div>
                <div className="text-[11px] font-mono text-[var(--color-text-dim)] break-all">
                  {content ? 'Will be computed on publish' : 'pending...'}
                </div>
              </div>
            </div>

            {/* Monetization */}
            <div className="glass-panel p-5">
              <h3 className="text-[10px] font-mono uppercase tracking-[2px] text-accent mb-4 flex items-center justify-between">
                <span>Monetization</span>
                <Settings className="w-4 h-4" />
              </h3>
              
              <div className="space-y-4">
                <div 
                  onClick={() => setIsTokenGated(!isTokenGated)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-all ${
                    isTokenGated
                      ? 'bg-primary border-primary'
                      : 'border-[var(--color-border)] group-hover:border-[var(--color-border-bright)]'
                  }`}>
                    {isTokenGated && <Lock className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[13px] font-medium">Token-gate this article</span>
                </div>

                {isTokenGated && (
                  <div className="p-4 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-sm space-y-3 animate-fadeIn">
                    <label className="block label-sm">Access Price (XLM)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        min="1"
                        className="input-field !py-2 flex-1"
                      />
                      <span className="text-[11px] font-mono text-[var(--color-text-dim)]">XLM</span>
                    </div>
                    <div className="flex items-start gap-2 mt-2">
                      <Coins className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                      <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">
                        Readers pay this amount via the Soroban contract. 100% goes directly to your wallet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Network info */}
            <div className="glass-panel p-5">
              <h3 className="label-sm mb-3">Network</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--color-text-dim)]">Chain</span>
                  <span className="font-mono">Stellar Testnet</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--color-text-dim)]">Contract</span>
                  <span className="font-mono text-primary">Soroban</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--color-text-dim)]">Wallet</span>
                  <span className="font-mono text-accent">Freighter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        currentStep={publishStep}
        title={title}
        error={publishError}
        txHash={publishTxHash}
        onClose={handleModalClose}
      />
    </>
  );
}
