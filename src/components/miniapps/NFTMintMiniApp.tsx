import { useState } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { useWallet } from '../../store/useWallet';
import { Gem, Sparkles, Hash, ExternalLink } from 'lucide-react';

interface NFTMintMiniAppProps {
  title: string;
  previewText: string;
  authorName: string;
}

export function NFTMintMiniApp({ title, previewText, authorName }: NFTMintMiniAppProps) {
  const { isConnected } = useWallet();
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState(false);
  const [tokenId, setTokenId] = useState<number | null>(null);

  const handleMint = async () => {
    if (!isConnected) return;
    setMinting(true);
    // Simulate minting for MVP
    await new Promise(r => setTimeout(r, 2000));
    const id = Math.floor(Math.random() * 9000) + 1000;
    setTokenId(id);
    setMinted(true);
    setMinting(false);
  };

  const config = {
    id: 'nft-mint',
    name: 'Quick Mint',
    name_ar: 'سكّ سريع',
    icon: '💎',
    type: 'nft-mint' as const,
    verified: true,
  };

  return (
    <MiniAppContainer config={config}>
      <div className="space-y-4">
        {!minted ? (
          <>
            {/* NFT Preview Card */}
            <div className="relative bg-gradient-to-br from-primary/10 via-[var(--color-surface)] to-accent/5 rounded-xl p-5 border border-primary/15 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-2 left-2 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute bottom-2 right-2 w-16 h-16 bg-accent/10 rounded-full blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Gem className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-primary uppercase tracking-wider">Content NFT</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Stellar × Soroban</div>
                  </div>
                </div>

                <h4 className="text-[15px] font-serif font-semibold text-[var(--color-text-main)] mb-2 leading-snug">
                  {title}
                </h4>
                <p className="text-[12px] text-[var(--color-text-dim)] leading-relaxed line-clamp-2">
                  {previewText}
                </p>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)]">بواسطة</span>
                  <span className="text-[11px] font-semibold text-primary">{authorName}</span>
                </div>
              </div>
            </div>

            {/* Mint Info */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'الشبكة', value: 'Stellar' },
                { label: 'العقد', value: 'Soroban' },
                { label: 'التكلفة', value: '~0.01 XLM' },
              ].map(item => (
                <div key={item.label} className="text-center p-2 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                  <div className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">{item.label}</div>
                  <div className="text-[11px] font-mono font-semibold text-[var(--color-text-main)]">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Mint Button */}
            <button
              onClick={handleMint}
              disabled={minting || !isConnected}
              className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer bg-gradient-to-r from-primary via-primary/90 to-accent/70 text-white hover:shadow-[0_0_30px_rgba(108,58,255,0.5)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {minting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري السكّ على Soroban...
                </>
              ) : (
                <>
                  <Gem className="w-4 h-4" />
                  سكّ كـ NFT الآن
                </>
              )}
            </button>
          </>
        ) : (
          /* Success State */
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center animate-bounce">
              <Sparkles className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h4 className="text-[18px] font-serif font-bold text-accent mb-1">تم السكّ بنجاح! 🎉</h4>
              <p className="text-[12px] text-[var(--color-text-dim)]">
                محتواك الآن مسجل بشكل دائم على بلوكشين Stellar
              </p>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[var(--color-text-muted)]">Token ID</span>
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3 text-primary" />
                  <span className="text-[12px] font-mono font-bold text-primary">{tokenId}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--color-text-muted)]">الحالة</span>
                <span className="text-[11px] font-mono text-accent flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  مؤكد على السلسلة
                </span>
              </div>
            </div>

            <button className="text-[11px] text-primary hover:text-accent transition-colors flex items-center gap-1 mx-auto cursor-pointer">
              عرض على Stellar Explorer <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </MiniAppContainer>
  );
}
