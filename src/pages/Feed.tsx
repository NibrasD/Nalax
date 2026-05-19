import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../store/useWallet';
import { formatAddress, addressGradient } from '../lib/utils';
import { TipJarMiniApp } from '../components/miniapps/TipJarMiniApp';
import { PollMiniApp } from '../components/miniapps/PollMiniApp';
import { NFTMintMiniApp } from '../components/miniapps/NFTMintMiniApp';
import { QuizMiniApp } from '../components/miniapps/QuizMiniApp';
import { StreakMiniApp } from '../components/miniapps/StreakMiniApp';
import {
  Heart, MessageCircle, Repeat2, Share2, MoreHorizontal,
  Zap, Shield, Image, Sparkles, TrendingUp, Globe, Users
} from 'lucide-react';

// ─── Demo Data ────────────────────────────────────────────────────────────────

interface Cast {
  id: string;
  author: {
    name: string;
    address: string;
    verified: boolean;
    avatar?: string;
  };
  text: string;
  timestamp: string;
  likes: number;
  replies: number;
  recasts: number;
  miniApp?: 'tip-jar' | 'poll' | 'nft-mint' | 'quiz' | 'streak';
  miniAppData?: any;
  liked?: boolean;
}

const DEMO_CASTS: Cast[] = [
  {
    id: '1',
    author: { name: 'سارة المنصوري', address: 'GAGCT4NM5BYYRG3N...', verified: true },
    text: 'أطلقت للتو مقالتي الجديدة عن مستقبل التمويل اللامركزي في العالم العربي 🚀 يمكنكم دعم المحتوى مباشرة عبر صندوق الدعم أدناه!',
    timestamp: 'منذ 12 دقيقة',
    likes: 24, replies: 8, recasts: 5,
    miniApp: 'tip-jar',
    miniAppData: { recipientName: 'سارة المنصوري', recipientAddress: 'GAGCT4NM5BYYRG3N...' },
  },
  {
    id: '2',
    author: { name: 'أحمد الخليفي', address: 'GBXYZ...DEF456', verified: true },
    text: 'ما رأيكم: هل ستصبح العقود الذكية على Stellar أهم من Ethereum في المنطقة العربية؟ صوّتوا! 👇',
    timestamp: 'منذ 34 دقيقة',
    likes: 67, replies: 23, recasts: 12,
    miniApp: 'poll',
    miniAppData: {
      question: 'هل ستتفوق Stellar على Ethereum في الشرق الأوسط؟',
      options: [
        { id: 'a', text: 'نعم، بسبب الرسوم المنخفضة', votes: 145 },
        { id: 'b', text: 'لا، Ethereum أقوى', votes: 67 },
        { id: 'c', text: 'سيتعايشان معاً', votes: 89 },
        { id: 'd', text: 'لست متأكداً بعد', votes: 34 },
      ],
    },
  },
  {
    id: 'quiz-1',
    author: { name: 'عمر المختار', address: 'GXYZ1...TEST1', verified: true },
    text: 'من يملك أسرع بديهة هنا؟ 🤓 مسابقة سريعة في أساسيات البلوكتشين وعقود Soroban. الفائز الأول في الـ Leaderboard سيربح 50 XLM!',
    timestamp: 'منذ ساعتين',
    likes: 312, replies: 84, recasts: 45,
    miniApp: 'quiz',
    miniAppData: {
      title: 'تحدي Soroban للمطورين',
      participants: 128,
      questions: [
        {
          id: 'q1',
          text: 'أي لغة برمجة تُستخدم لكتابة عقود Soroban الذكية؟',
          options: [
            { id: '1', text: 'Solidity', isCorrect: false },
            { id: '2', text: 'Rust', isCorrect: true },
            { id: '3', text: 'Go', isCorrect: false },
            { id: '4', text: 'C++', isCorrect: false },
          ]
        },
        {
          id: 'q2',
          text: 'ما هو زمن تأكيد المعاملة التقريبي على شبكة Stellar؟',
          options: [
            { id: '1', text: '12 ثانية', isCorrect: false },
            { id: '2', text: '10 دقائق', isCorrect: false },
            { id: '3', text: '3-5 ثوانٍ', isCorrect: true },
            { id: '4', text: 'ساعة', isCorrect: false },
          ]
        }
      ],
    },
  },
  {
    id: 'streak-1',
    author: { name: 'فاطمة أحمد', address: 'GXYZ2...TEST2', verified: false },
    text: 'بدأت تحدي القراءة اليومي على المنصة 📚🔥 الهدف: 30 يوماً متتالية من قراءة مقالات Web3. من ينضم إلي لنشكل مجتمعاً معرفياً؟ سجّلوا قراءتكم اليومية على السلسلة.',
    timestamp: 'منذ 4 ساعات',
    likes: 89, replies: 21, recasts: 12,
    miniApp: 'streak',
    miniAppData: {
      challengeName: '#30DaysOfWeb3',
      targetDays: 30,
      participants: 543,
    },
  },
  {
    id: '3',
    author: { name: 'نورة الدوسري', address: 'GCABC...GHI789', verified: false },
    text: 'كتبت مقالاً حول تجربتي في بناء أول تطبيق لامركزي. يمكنكم سكّه كـ NFT مباشرة من هنا! المحتوى سيُحفظ إلى الأبد على بلوكشين Stellar ✨',
    timestamp: 'منذ ساعة',
    likes: 156, replies: 45, recasts: 28,
    miniApp: 'nft-mint',
    miniAppData: {
      title: 'رحلتي في بناء أول dApp على Stellar',
      previewText: 'بدأت رحلتي في عالم البلوكشين قبل عامين. لم أكن أعرف شيئاً عن العقود الذكية، لكن Soroban غيّر كل شيء...',
      authorName: 'نورة الدوسري',
    },
  },
  {
    id: '4',
    author: { name: 'خالد الراشد', address: 'GDEFG...JKL012', verified: true },
    text: 'الميزة الأقوى في StellarScribe هي أن كل تفاعل حقيقي — الإكراميات تذهب مباشرة للكاتب بدون وسيط، والمحتوى مسجل على السلسلة. هذا هو مستقبل الإعلام! 🔗',
    timestamp: 'منذ ساعتين',
    likes: 89, replies: 15, recasts: 7,
  },
  {
    id: '5',
    author: { name: 'ليلى حسن', address: 'GHIJK...MNO345', verified: true },
    text: 'سؤال للمطورين: هل جرّبتم بناء MiniApps على StellarScribe؟ الـ SDK بسيط جداً ويمكنك تضمين أي تطبيق تفاعلي داخل منشوراتك. الاحتمالات لا نهائية! 🧩',
    timestamp: 'منذ 3 ساعات',
    likes: 43, replies: 19, recasts: 11,
  },
];

// ─── Cast Card Component ──────────────────────────────────────────────────────

function CastCard({ cast }: { cast: Cast }) {
  const [liked, setLiked] = useState(cast.liked || false);
  const [likeCount, setLikeCount] = useState(cast.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <div className="glass-panel p-5 hover:border-primary/10 transition-all duration-300 group">
      {/* Author Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full shrink-0 relative ring-2 ring-[var(--color-border)] ring-offset-2 ring-offset-[var(--color-bg-base)]"
            style={{ background: addressGradient(cast.author.address) }}
          >
            {cast.author.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-accent flex items-center justify-center border-2 border-[var(--color-bg-elevated)]">
                <Shield className="w-2.5 h-2.5 text-black" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-[var(--color-text-main)]">
                {cast.author.name}
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">{cast.timestamp}</span>
          </div>
        </div>
        <button className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Cast Text */}
      <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.7] mb-4">
        {cast.text}
      </p>

      {/* Embedded MiniApp */}
      {cast.miniApp && (
        <div className="mb-4">
          {cast.miniApp === 'tip-jar' && (
            <TipJarMiniApp
              recipientName={cast.miniAppData.recipientName}
              recipientAddress={cast.miniAppData.recipientAddress}
            />
          )}
          {cast.miniApp === 'poll' && (
            <PollMiniApp
              question={cast.miniAppData.question}
              options={cast.miniAppData.options}
            />
          )}
          {cast.miniApp === 'nft-mint' && (
            <NFTMintMiniApp
              title={cast.miniAppData.title}
              previewText={cast.miniAppData.previewText}
              authorName={cast.miniAppData.authorName}
            />
          )}
          {cast.miniApp === 'quiz' && (
            <QuizMiniApp
              title={cast.miniAppData.title}
              questions={cast.miniAppData.questions}
              participants={cast.miniAppData.participants}
            />
          )}
          {cast.miniApp === 'streak' && (
            <StreakMiniApp
              challengeName={cast.miniAppData.challengeName}
              targetDays={cast.miniAppData.targetDays}
              participants={cast.miniAppData.participants}
            />
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
        {[
          { icon: Heart, count: likeCount, active: liked, onClick: handleLike, activeColor: 'text-red-400' },
          { icon: MessageCircle, count: cast.replies, onClick: () => {} },
          { icon: Repeat2, count: cast.recasts, onClick: () => {} },
          { icon: Share2, count: 0, onClick: () => {} },
        ].map(({ icon: Icon, count, active, onClick, activeColor }, i) => (
          <button
            key={i}
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              active
                ? `${activeColor || 'text-primary'} bg-red-400/10`
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

// ─── Feed Page ────────────────────────────────────────────────────────────────

export function Feed() {
  const { t } = useTranslation();
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'miniapps'>('for-you');

  const tabs = [
    { id: 'for-you', label: 'لك', icon: Sparkles },
    { id: 'following', label: 'المتابَعون', icon: Users },
    { id: 'miniapps', label: 'MiniApps', icon: Zap },
  ];

  const filteredCasts = activeTab === 'miniapps'
    ? DEMO_CASTS.filter(c => c.miniApp)
    : DEMO_CASTS;

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
              منشورات المجتمع مع تطبيقات مصغرة تفاعلية
            </p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-main)] shadow-sm border border-[var(--color-border)]'
                  : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Compose Box */}
      {isConnected && (
        <div className="glass-panel p-4 mb-6">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full shrink-0"
              style={{ background: 'linear-gradient(135deg, #6C3AFF 0%, #00E87B 100%)' }}
            />
            <div className="flex-1">
              <textarea
                placeholder="ماذا يدور في خاطرك؟"
                className="w-full bg-transparent text-[15px] outline-none resize-none placeholder:text-[var(--color-text-muted)] leading-relaxed"
                rows={2}
              />
              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  {[
                    { icon: Image, tip: 'صورة' },
                    { icon: Zap, tip: 'MiniApp' },
                  ].map(({ icon: Icon, tip }) => (
                    <button
                      key={tip}
                      className="p-2 rounded-lg text-[var(--color-text-dim)] hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                      title={tip}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                  <div className="h-5 w-px bg-[var(--color-border)]" />
                  <span className="text-[10px] font-mono text-primary flex items-center gap-1">
                    <Zap className="w-3 h-3" /> أضف MiniApp
                  </span>
                </div>
                <button className="px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:shadow-[0_0_20px_rgba(108,58,255,0.3)] transition-all cursor-pointer">
                  نشر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trending MiniApps Banner */}
      {activeTab === 'for-you' && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-l from-primary/10 via-primary/5 to-accent/10 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[12px] font-semibold text-primary">التطبيقات المصغرة الأكثر استخداماً</span>
          </div>
          <div className="flex items-center gap-3">
            {[
              { name: 'صندوق الدعم', icon: '💰', uses: '2.4K' },
              { name: 'استطلاع سريع', icon: '📊', uses: '1.8K' },
              { name: 'سكّ سريع', icon: '💎', uses: '956' },
            ].map(app => (
              <div
                key={app.name}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-elevated)]/80 rounded-lg border border-[var(--color-border)] cursor-pointer hover:border-primary/20 transition-colors"
              >
                <span className="text-[14px]">{app.icon}</span>
                <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">{app.name}</span>
                <span className="text-[9px] font-mono text-[var(--color-text-muted)]">{app.uses}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cast Feed */}
      <div className="space-y-4">
        {filteredCasts.map(cast => (
          <CastCard key={cast.id} cast={cast} />
        ))}
      </div>
    </div>
  );
}
