import { Link } from 'react-router-dom';
import { Users, FileText, Lock, ArrowUpRight } from 'lucide-react';
import type { Channel } from '../store/useChannelStore';
import { useChannelStore } from '../store/useChannelStore';
import { useWallet } from '../store/useWallet';

interface ChannelCardProps {
  channel: Channel;
  index?: number;
}

export function ChannelCard({ channel, index = 0 }: ChannelCardProps) {
  const { joinedChannelIds, joinChannel, leaveChannel } = useChannelStore();
  const { isConnected } = useWallet();
  const isJoined = joinedChannelIds.includes(channel.id);

  const handleJoinToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isConnected) return;
    isJoined ? leaveChannel(channel.id) : joinChannel(channel.id);
  };

  return (
    <Link
      to={`/channels/${channel.id}`}
      className="group glass-panel overflow-hidden flex flex-col hover:border-[var(--color-border-bright)] transition-all duration-500 animate-fadeIn relative"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* Banner gradient */}
      <div className={`h-20 bg-gradient-to-r ${channel.bannerColor} relative overflow-hidden flex-shrink-0`}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.5) 10px, rgba(255,255,255,0.5) 11px)' }}
        />
        {/* Icon bubble */}
        <div className="absolute bottom-0 left-5 translate-y-1/2 w-12 h-12 rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border)] flex items-center justify-center text-2xl shadow-lg">
          {channel.icon}
        </div>
        {/* Private badge */}
        {channel.isPrivate && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[var(--color-bg-base)]/80 backdrop-blur-sm rounded-full border border-[var(--color-border)] text-[9px] font-mono uppercase tracking-wider text-[var(--color-text-dim)]">
            <Lock className="w-2.5 h-2.5" /> خاص
          </div>
        )}
      </div>

      {/* Body */}
      <div className="pt-8 pb-5 px-5 flex flex-col flex-grow">
        {/* Name + Join */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-main)] group-hover:text-primary transition-colors leading-tight">
            {channel.name}
          </h3>
          {isConnected && (
            <button
              onClick={handleJoinToggle}
              className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[1px] border transition-all duration-200 cursor-pointer ${
                isJoined
                  ? 'bg-primary/10 text-primary border-primary/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-primary/10 hover:text-primary hover:border-primary/30'
              }`}
            >
              {isJoined ? 'مُنضم ✓' : 'انضم'}
            </button>
          )}
        </div>

        {/* Description */}
        <p className="text-[12px] leading-[1.6] text-[var(--color-text-dim)] line-clamp-2 mb-4 flex-grow">
          {channel.description}
        </p>

        {/* Tags */}
        {channel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {channel.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-mono text-primary/70 uppercase tracking-wider"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats footer */}
        <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-dim)]">
            <Users className="w-3.5 h-3.5 text-primary/60" />
            <span>{channel.memberCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-dim)]">
            <FileText className="w-3.5 h-3.5 text-accent/60" />
            <span>{channel.postCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-3 right-3 w-6 h-6 border border-[var(--color-border)] flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-primary group-hover:border-primary transition-all duration-300 rounded-sm">
        <ArrowUpRight className="w-3 h-3 text-white" />
      </div>
    </Link>
  );
}
