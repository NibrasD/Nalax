import { Link } from 'react-router-dom';
import { type Article } from '../store/useAppStore';
import { formatAddress, formatTimeAgo, addressGradient } from '../lib/utils';
import { ArrowUpRight, Lock, TrendingUp, Clock, Eye, Heart } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  index?: number;
}

export function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  const progressPercent = article.crowdfundingGoal && article.totalRaised
    ? Math.min(100, (article.totalRaised / article.crowdfundingGoal) * 100)
    : null;

  return (
    <Link 
      to={`/article/${article.id}`}
      className="group glass-panel overflow-hidden flex flex-col hover:border-[var(--color-border-bright)] transition-all duration-500 animate-fadeIn"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Image */}
      {article.featuredImage ? (
        <div className="h-48 overflow-hidden relative border-b border-[var(--color-border)]">
          <img 
            src={article.featuredImage} 
            alt={article.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-3 right-3 flex gap-2">
            {article.isTokenGated && (
              <div className="bg-[var(--color-bg-base)]/90 backdrop-blur-sm text-[9px] font-mono px-2 py-1 border border-[var(--color-border)] flex items-center gap-1 uppercase tracking-wider rounded-sm">
                <Lock className="w-3 h-3 text-primary" /> Gated
              </div>
            )}
            {article.crowdfundingGoal && (
              <div className="bg-[var(--color-bg-base)]/90 backdrop-blur-sm text-[9px] font-mono px-2 py-1 border border-[var(--color-border)] flex items-center gap-1 uppercase tracking-wider rounded-sm">
                <TrendingUp className="w-3 h-3 text-accent" /> Fund
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-48 bg-gradient-card border-b border-[var(--color-border)] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)',
          }} />
          <span className="font-serif text-[48px] text-white/[0.06]">{article.title.charAt(0)}</span>
        </div>
      )}
      
      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Meta */}
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-[var(--color-text-dim)] mb-3">
          <div className="w-5 h-5 rounded-full shrink-0" style={{ background: addressGradient(article.authorPublicKey) }} />
          <span className="text-primary">{article.authorName || formatAddress(article.authorPublicKey)}</span>
          <span className="text-[var(--color-text-muted)]">•</span>
          <span>{formatTimeAgo(article.createdAt)}</span>
        </div>
        
        {/* Title */}
        <h2 className="text-[20px] font-serif mb-2 group-hover:text-primary transition-colors leading-tight line-clamp-2">
          {article.title}
        </h2>
        
        {/* Excerpt */}
        <p className="text-[13px] leading-[1.6] text-[var(--color-text-dim)] line-clamp-2 mb-4 flex-grow">
          {article.excerpt}
        </p>
        
        {/* Footer */}
        <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            {article.readTime && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-text-dim)]">
                <Clock className="w-3 h-3" />
                {article.readTime}
              </div>
            )}
            {article.accessCount !== undefined && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-text-dim)]">
                <Eye className="w-3 h-3" />
                {article.accessCount}
              </div>
            )}
            {article.tipCount !== undefined && article.tipCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-accent">
                <Heart className="w-3 h-3" />
                {article.tipCount}
              </div>
            )}
          </div>

          {/* Crowdfunding progress or raised amount */}
          {progressPercent !== null ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-[3px] bg-white/5 overflow-hidden rounded-full">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-[10px] font-mono text-accent">{Math.round(progressPercent)}%</span>
            </div>
          ) : article.totalRaised !== undefined && article.totalRaised > 0 ? (
            <span className="text-[10px] font-mono text-[var(--color-text-dim)]">
              {article.totalRaised.toLocaleString()} XLM
            </span>
          ) : null}
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-4 left-4 w-7 h-7 border border-[var(--color-border)] flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-primary group-hover:border-primary transition-all duration-300 rounded-sm">
        <ArrowUpRight className="w-3.5 h-3.5 text-white" />
      </div>
    </Link>
  );
}
