import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users, FileText, ArrowRight, Shield, Heart,
  MessageCircle, Repeat2, Share2, MoreHorizontal,
  PenSquare, Hash, Lock, ChevronUp, Zap, Image,
} from 'lucide-react';
import { useChannelStore, type ChannelPost } from '../store/useChannelStore';
import { useWallet } from '../store/useWallet';
import { addressGradient } from '../lib/utils';
import { TipJarMiniApp }  from '../components/miniapps/TipJarMiniApp';
import { PollMiniApp }    from '../components/miniapps/PollMiniApp';
import { NFTMintMiniApp } from '../components/miniapps/NFTMintMiniApp';
import { QuizMiniApp }    from '../components/miniapps/QuizMiniApp';
import { StreakMiniApp }  from '../components/miniapps/StreakMiniApp';

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: ChannelPost }) {
  const { likePost } = useChannelStore();
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    likePost(post.id);
  };

  return (
    <div className="glass-panel p-5 hover:border-primary/10 transition-all duration-300 group">
      {/* Author */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full shrink-0 ring-2 ring-[var(--color-border)] ring-offset-2 ring-offset-[var(--color-bg-base)]"
            style={{ background: addressGradient(post.author.address) }}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-[var(--color-text-main)]">
                {post.author.name}
              </span>
              {post.author.verified && (
                <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                  <Shield className="w-2.5 h-2.5 text-black" />
                </div>
              )}
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">{post.timestamp}</span>
          </div>
        </div>
        <button className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="text-[17px] font-serif mb-2 text-[var(--color-text-main)] leading-snug">
          {post.title}
        </h3>
      )}

      {/* Body */}
      <p className="text-[14px] text-[var(--color-text-secondary)] leading-[1.7] mb-4">
        {post.text}
      </p>

      {/* MiniApp */}
      {post.miniApp && (
        <div className="mb-4">
          {post.miniApp === 'tip-jar'  && <TipJarMiniApp  recipientName={post.miniAppData.recipientName}  recipientAddress={post.miniAppData.recipientAddress} />}
          {post.miniApp === 'poll'     && <PollMiniApp     question={post.miniAppData.question}            options={post.miniAppData.options} />}
          {post.miniApp === 'nft-mint' && <NFTMintMiniApp  title={post.miniAppData.title}                  previewText={post.miniAppData.previewText} authorName={post.miniAppData.authorName} />}
          {post.miniApp === 'quiz'     && <QuizMiniApp     title={post.miniAppData.title}                  questions={post.miniAppData.questions} participants={post.miniAppData.participants} />}
          {post.miniApp === 'streak'   && <StreakMiniApp   challengeName={post.miniAppData.challengeName}  targetDays={post.miniAppData.targetDays} participants={post.miniAppData.participants} />}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
        {[
          { icon: Heart,         count: post.likes,   active: liked,  onClick: handleLike,  activeColor: 'text-red-400' },
          { icon: MessageCircle, count: post.replies, active: false,  onClick: () => {},    activeColor: '' },
          { icon: Repeat2,       count: post.recasts, active: false,  onClick: () => {},    activeColor: '' },
          { icon: Share2,        count: 0,            active: false,  onClick: () => {},    activeColor: '' },
        ].map(({ icon: Icon, count, active, onClick, activeColor }, i) => (
          <button
            key={i}
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              active
                ? `${activeColor} bg-red-400/10`
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <Icon className={`w-4 h-4 ${active ? 'fill-current' : ''}`} />
            {count > 0 && <span className="text-[12px]">{count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Compose Box ──────────────────────────────────────────────────────────────

function ComposeBox({ channelId }: { channelId: string }) {
  const { addPost } = useChannelStore();
  const { publicKey } = useWallet();
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim() || !publicKey) return;
    addPost({
      id: `post-${Date.now()}`,
      channelId,
      author: { name: publicKey.slice(0, 4) + '...' + publicKey.slice(-4), address: publicKey, verified: false },
      text: text.trim(),
      timestamp: 'الآن',
      createdAt: Date.now(),
      likes: 0, replies: 0, recasts: 0,
    });
    setText('');
  };

  return (
    <div className="glass-panel p-4 mb-6">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full shrink-0"
          style={{ background: addressGradient(publicKey || 'default') }}
        />
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شاركنا أفكارك في هذه القناة..."
            className="w-full bg-transparent text-[14px] outline-none resize-none placeholder:text-[var(--color-text-muted)] leading-relaxed"
            rows={3}
          />
          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              {[{ icon: Image, tip: 'صورة' }, { icon: Zap, tip: 'MiniApp' }].map(({ icon: Icon, tip }) => (
                <button
                  key={tip}
                  className="p-2 rounded-lg text-[var(--color-text-dim)] hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  title={tip}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:shadow-[0_0_20px_rgba(108,58,255,0.3)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              نشر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Channel Detail Page ──────────────────────────────────────────────────────

export function ChannelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { channels, posts, joinedChannelIds, joinChannel, leaveChannel } = useChannelStore();
  const { isConnected } = useWallet();

  const channel = channels.find((c) => c.id === id);
  const channelPosts = posts
    .filter((p) => p.channelId === id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const isJoined = id ? joinedChannelIds.includes(id) : false;

  const handleJoinToggle = () => {
    if (!id || !isConnected) return;
    isJoined ? leaveChannel(id) : joinChannel(id);
  };

  if (!channel) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
          <Hash className="w-7 h-7 text-[var(--color-text-muted)]" />
        </div>
        <h2 className="text-2xl font-serif mb-3">القناة غير موجودة</h2>
        <p className="text-[var(--color-text-dim)] mb-6 font-mono text-[13px]">
          لا توجد قناة بالمعرّف: <span className="text-primary">{id}</span>
        </p>
        <button onClick={() => navigate('/channels')} className="btn-primary">
          العودة إلى القنوات
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 animate-fadeIn">

      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--color-text-dim)] mb-6">
        <Link to="/channels" className="hover:text-primary transition-colors flex items-center gap-1">
          <Hash className="w-3 h-3" /> القنوات
        </Link>
        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        <span className="text-[var(--color-text-secondary)]">{channel.name}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">

        {/* ── Main Column ─────────────────────────────────────────── */}
        <div>
          {/* Channel header card */}
          <div className="glass-panel overflow-hidden mb-6">
            {/* Banner */}
            <div className={`h-28 bg-gradient-to-r ${channel.bannerColor} relative`}>
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.5) 10px, rgba(255,255,255,0.5) 11px)' }}
              />
              <div className="absolute bottom-0 left-6 translate-y-1/2 w-16 h-16 rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border)] flex items-center justify-center text-3xl shadow-xl">
                {channel.icon}
              </div>
            </div>

            {/* Info */}
            <div className="pt-12 pb-5 px-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-[24px] font-serif">{channel.name}</h1>
                    {channel.isPrivate && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[9px] font-mono uppercase tracking-wider text-[var(--color-text-dim)]">
                        <Lock className="w-2.5 h-2.5" /> خاص
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] font-mono text-primary/60">#{channel.id}</span>
                </div>

                {isConnected && (
                  <button
                    onClick={handleJoinToggle}
                    className={`px-5 py-2.5 rounded-lg text-[12px] font-semibold border transition-all duration-200 cursor-pointer ${
                      isJoined
                        ? 'bg-primary/10 text-primary border-primary/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30'
                        : 'bg-primary text-white border-primary hover:shadow-[0_0_20px_rgba(108,58,255,0.35)]'
                    }`}
                  >
                    {isJoined ? 'مُنضم — اضغط للمغادرة' : '+ انضم إلى القناة'}
                  </button>
                )}
              </div>

              <p className="text-[14px] text-[var(--color-text-dim)] leading-[1.7] mt-3">
                {channel.description}
              </p>

              {/* Tags */}
              {channel.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {channel.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-mono text-primary/70 uppercase tracking-wider">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-6 mt-5 pt-4 border-t border-[var(--color-border)]">
                {[
                  { icon: Users,    val: channel.memberCount.toLocaleString(), label: 'عضو',    color: 'text-primary' },
                  { icon: FileText, val: channel.postCount.toLocaleString(),   label: 'منشور',  color: 'text-accent'  },
                  { icon: ChevronUp, val: isJoined ? 'مُنضم' : 'متاح',        label: 'الحالة', color: isJoined ? 'text-accent' : 'text-[var(--color-text-dim)]' },
                ].map(({ icon: Icon, val, label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div>
                      <div className={`text-[14px] font-semibold ${color}`}>{val}</div>
                      <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Compose */}
          {isConnected && isJoined && <ComposeBox channelId={channel.id} />}
          {isConnected && !isJoined && (
            <div className="glass-panel p-4 mb-6 text-center border-dashed">
              <p className="text-[13px] text-[var(--color-text-dim)] mb-3">انضم إلى القناة لتتمكن من النشر فيها</p>
              <button onClick={handleJoinToggle} className="btn-primary text-[12px] px-5 py-2">
                + انضم الآن
              </button>
            </div>
          )}

          {/* Posts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-[var(--color-text-secondary)] flex items-center gap-2">
                <PenSquare className="w-4 h-4 text-primary" />
                المنشورات ({channelPosts.length})
              </h2>
            </div>

            {channelPosts.length > 0 ? (
              <div className="space-y-4">
                {channelPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="glass-panel p-14 text-center">
                <div className="text-4xl mb-3">🌱</div>
                <h3 className="text-lg font-serif mb-2 text-[var(--color-text-secondary)]">لا توجد منشورات بعد</h3>
                <p className="text-[13px] text-[var(--color-text-dim)] font-mono">كن أول من يشارك في هذه القناة!</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="space-y-4 sticky top-28">
          {/* About */}
          <div className="glass-panel p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)] mb-3 flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-primary" /> عن القناة
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-[1.65] mb-4">
              {channel.description}
            </p>
            <div className="space-y-2.5">
              {[
                { label: 'الأعضاء',   val: channel.memberCount.toLocaleString() },
                { label: 'المنشورات', val: channel.postCount.toLocaleString() },
                { label: 'تاريخ الإنشاء', val: new Date(channel.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--color-text-muted)] font-mono uppercase tracking-wide">{label}</span>
                  <span className="text-[var(--color-text-secondary)] font-semibold">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="glass-panel p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)] mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" /> قواعد القناة
            </h3>
            <ul className="space-y-2">
              {[
                'احترم جميع الأعضاء',
                'المحتوى ذو الصلة بالقناة فقط',
                'لا للبريد العشوائي أو الروابط المشبوهة',
                'تحقق من المعلومات قبل نشرها',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--color-text-secondary)]">
                  <span className="text-primary font-mono shrink-0">{i + 1}.</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Related channels */}
          <div className="glass-panel p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)] mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-primary" /> قنوات مشابهة
            </h3>
            <div className="space-y-2">
              {channels
                .filter((c) => c.id !== channel.id)
                .slice(0, 3)
                .map((c) => (
                  <Link
                    key={c.id}
                    to={`/channels/${c.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors group"
                  >
                    <span className="text-xl">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--color-text-secondary)] group-hover:text-primary transition-colors truncate">
                        {c.name}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--color-text-muted)]">
                        {c.memberCount.toLocaleString()} عضو
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
            <Link
              to="/channels"
              className="mt-3 block text-center text-[11px] font-mono text-primary hover:text-white transition-colors"
            >
              عرض كل القنوات ←
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
