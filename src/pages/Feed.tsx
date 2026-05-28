import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../store/useWallet';
import { formatAddress, addressGradient } from '../lib/utils';
import { TipJarMiniApp } from '../components/miniapps/TipJarMiniApp';
import { fetchAllArticlesFromChain } from '../lib/stellar';
import { Link } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2,
  Zap, Shield, Sparkles, Globe, Users, BookOpen, Loader2
} from 'lucide-react';

// ─── Article Feed Card ────────────────────────────────────────────────────────

function ArticleFeedCard({ article }: { article: any }) {
  return (
    <div className="glass-panel p-5 hover:border-primary/10 transition-all duration-300 group">
      {/* Author Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full shrink-0 relative ring-2 ring-[var(--color-border)] ring-offset-2 ring-offset-[var(--color-bg-base)]"
            style={{ background: addressGradient(article.authorPublicKey) }}
          >
            <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-accent flex items-center justify-center border-2 border-[var(--color-bg-elevated)]">
              <Shield className="w-2.5 h-2.5 text-black" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-[var(--color-text-main)]">
                {article.authorName || formatAddress(article.authorPublicKey)}
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {new Date(article.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <Link to={`/article/${article.id}`} className="block mb-4">
        <h3 className="text-[17px] font-serif mb-2 group-hover:text-primary transition-colors leading-tight">
          {article.title}
        </h3>
        <p className="text-[14px] text-[var(--color-text-dim)] leading-[1.7] line-clamp-3">
          {article.excerpt}
        </p>
      </Link>

      {/* Tip Jar */}
      <div className="mb-4">
        <TipJarMiniApp
          recipientName={article.authorName || formatAddress(article.authorPublicKey)}
          recipientAddress={article.authorPublicKey}
          tokenId={article.tokenId}
        />
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          {article.tipCount > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] text-accent">
              <Heart className="w-4 h-4" /> {article.tipCount}
            </span>
          )}
          {article.accessCount > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
              <BookOpen className="w-4 h-4" /> {article.accessCount}
            </span>
          )}
        </div>
        <Link
          to={`/article/${article.id}`}
          className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-dim)] hover:text-primary transition-colors"
        >
          اقرأ المقال →
        </Link>
      </div>
    </div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

export function Feed() {
  const { t } = useTranslation();
  const { isConnected } = useWallet();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const onChain = await fetchAllArticlesFromChain();
        setArticles(onChain.sort((a: any, b: any) => b.createdAt - a.createdAt));
      } catch (e) {
        console.error('Failed to fetch feed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-6 animate-fadeIn">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-serif tracking-[-0.5px] leading-tight">الخلاصة</h1>
            <p className="text-[12px] text-[var(--color-text-dim)]">
              أحدث المقالات المنشورة على السلسلة
            </p>
          </div>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="glass-panel p-16 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-serif mb-2">جاري التحميل من Stellar...</h3>
          <p className="text-[12px] text-[var(--color-text-dim)] font-mono">جلب المقالات من العقد الذكي</p>
        </div>
      ) : articles.length > 0 ? (
        <div className="space-y-4">
          {articles.map(article => (
            <ArticleFeedCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-serif mb-2">لا توجد مقالات بعد</h3>
          <p className="text-[13px] text-[var(--color-text-dim)] mb-4">كن أول من ينشر على المنصة!</p>
          <Link to="/write" className="text-primary hover:underline text-[13px]">
            ابدأ الكتابة →
          </Link>
        </div>
      )}
    </div>
  );
}
