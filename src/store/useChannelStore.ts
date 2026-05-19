import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;           // slug e.g. "stellar-dev"
  name: string;         // display name
  description: string;
  creatorPublicKey: string;
  memberCount: number;
  postCount: number;
  createdAt: number;
  icon: string;         // emoji
  tags: string[];
  isPrivate: boolean;
  bannerColor: string;  // tailwind gradient class
}

export interface ChannelPost {
  id: string;
  channelId: string;
  author: {
    name: string;
    address: string;
    verified: boolean;
  };
  title?: string;
  text: string;
  timestamp: string;
  createdAt: number;
  likes: number;
  replies: number;
  recasts: number;
  miniApp?: 'tip-jar' | 'poll' | 'nft-mint' | 'quiz' | 'streak';
  miniAppData?: any;
  articleId?: string;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const SEED_CHANNELS: Channel[] = [
  {
    id: 'stellar-dev',
    name: 'Stellar Developers',
    description: 'مجتمع المطورين الذين يبنون على شبكة Stellar وعقود Soroban الذكية. شارك مشاريعك، اطرح أسئلتك، وتعلم من الخبراء.',
    creatorPublicKey: 'GAGCT4NM5BYYRG3NSLMGPJWU5KGCXTHVEGUGN5DLRU7MN2KTXBLIJ7WJ',
    memberCount: 1240,
    postCount: 342,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    icon: '⚡',
    tags: ['soroban', 'rust', 'smart-contracts'],
    isPrivate: false,
    bannerColor: 'from-primary/30 to-accent/20',
  },
  {
    id: 'arabic-web3',
    name: 'عالم Web3 العربي',
    description: 'مساحة حرة للمجتمع العربي للنقاش حول البلوكتشين، العملات الرقمية، والتمويل اللامركزي. أخبار، تحليلات، وفرص.',
    creatorPublicKey: 'GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    memberCount: 3580,
    postCount: 891,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    icon: '🌍',
    tags: ['web3', 'defi', 'arabic', 'crypto'],
    isPrivate: false,
    bannerColor: 'from-green-600/30 to-emerald-400/20',
  },
  {
    id: 'content-creators',
    name: 'صانعو المحتوى',
    description: 'للكتّاب والمدوّنين والمبدعين الذين يودّون توثيق أعمالهم على السلسلة وبناء جمهور مخلص عبر NFTs.',
    creatorPublicKey: 'GCREATOR1234567890ABCDEFGHIJKLMNOP',
    memberCount: 865,
    postCount: 210,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    icon: '✍️',
    tags: ['writing', 'nft', 'content', 'creators'],
    isPrivate: false,
    bannerColor: 'from-purple-600/30 to-pink-400/20',
  },
  {
    id: 'defi-mena',
    name: 'DeFi MENA',
    description: 'ناقش فرص التمويل اللامركزي في منطقة الشرق الأوسط وشمال أفريقيا. بروتوكولات، استراتيجيات، ومستجدات السوق.',
    creatorPublicKey: 'GDEFI1234567890ABCDEFGHIJKLMNOPQRST',
    memberCount: 2100,
    postCount: 567,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    icon: '💰',
    tags: ['defi', 'yield', 'mena', 'finance'],
    isPrivate: false,
    bannerColor: 'from-yellow-600/30 to-orange-400/20',
  },
  {
    id: 'nft-artists',
    name: 'فنانو NFT',
    description: 'مجتمع الفنانين الرقميين الذين يسكّون أعمالهم على Stellar. عرض الأعمال، تبادل الخبرات، والتعاون الإبداعي.',
    creatorPublicKey: 'GART1234567890ABCDEFGHIJKLMNOPQRSTU',
    memberCount: 430,
    postCount: 128,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    icon: '🎨',
    tags: ['nft', 'art', 'digital', 'creative'],
    isPrivate: false,
    bannerColor: 'from-rose-600/30 to-fuchsia-400/20',
  },
  {
    id: 'stellar-news',
    name: 'أخبار Stellar',
    description: 'آخر المستجدات والأخبار الرسمية من شبكة Stellar ومؤسسة SDF. تحديثات البروتوكول والشراكات والإعلانات.',
    creatorPublicKey: 'GNEWS1234567890ABCDEFGHIJKLMNOPQRSTU',
    memberCount: 5200,
    postCount: 1034,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
    icon: '📡',
    tags: ['news', 'stellar', 'updates', 'announcements'],
    isPrivate: false,
    bannerColor: 'from-blue-600/30 to-cyan-400/20',
  },
];

const SEED_POSTS: ChannelPost[] = [
  {
    id: 'post-1',
    channelId: 'stellar-dev',
    author: { name: 'أحمد الخليفي', address: 'GBXYZ...DEF456', verified: true },
    title: 'كيف تكتب أول عقد Soroban بـ Rust في 30 دقيقة',
    text: 'شاركت أمس في ورشة عمل عن Soroban وكانت تجربة رائعة. إليكم الخطوات الأساسية للبدء...',
    timestamp: 'منذ ساعتين',
    createdAt: Date.now() - 1000 * 60 * 120,
    likes: 84, replies: 23, recasts: 15,
    miniApp: 'poll',
    miniAppData: {
      question: 'هل جربت بناء عقد Soroban من قبل؟',
      options: [
        { id: 'a', text: 'نعم، لدي تجربة', votes: 89 },
        { id: 'b', text: 'لا، لكنني مهتم', votes: 145 },
        { id: 'c', text: 'أعمل عليه الآن', votes: 67 },
      ],
    },
  },
  {
    id: 'post-2',
    channelId: 'stellar-dev',
    author: { name: 'سارة المنصوري', address: 'GAGCT4NM5...', verified: true },
    title: 'مشروعي الجديد: منصة StellarNFT للفنانين',
    text: 'أعلن اليوم عن بدء العمل على منصة لامركزية خاصة بالفنانين العرب للسك على Stellar. هل أحد مهتم بالانضمام؟',
    timestamp: 'منذ 5 ساعات',
    createdAt: Date.now() - 1000 * 60 * 300,
    likes: 156, replies: 45, recasts: 28,
    miniApp: 'tip-jar',
    miniAppData: {
      recipientName: 'سارة المنصوري',
      recipientAddress: 'GAGCT4NM5BYYRG3N...',
    },
  },
  {
    id: 'post-3',
    channelId: 'arabic-web3',
    author: { name: 'محمد العمري', address: 'GXYZ1...TEST3', verified: false },
    title: 'تحليل: مستقبل DeFi في الوطن العربي',
    text: 'بعد متابعة السوق لأكثر من سنتين، أرى أن الفرصة الأكبر في منطقتنا هي في التحويلات المالية عبر Stellar. الرسوم المنخفضة والسرعة العالية تجعله مثالياً للمغتربين.',
    timestamp: 'منذ يوم',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    likes: 312, replies: 84, recasts: 45,
  },
  {
    id: 'post-4',
    channelId: 'arabic-web3',
    author: { name: 'نورة الدوسري', address: 'GCABC...GHI789', verified: true },
    title: 'تحدي: 30 يوم مع Web3',
    text: 'انضم معي في تحدي تعلم Web3 لمدة شهر كامل. كل يوم سأنشر هنا ما تعلمته. يوم 1: ما هو البلوكتشين؟ 🚀',
    timestamp: 'منذ 3 أيام',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    likes: 89, replies: 21, recasts: 12,
    miniApp: 'streak',
    miniAppData: {
      challengeName: '#30DaysOfWeb3',
      targetDays: 30,
      participants: 234,
    },
  },
  {
    id: 'post-5',
    channelId: 'content-creators',
    author: { name: 'ليلى حسن', address: 'GHIJK...MNO345', verified: true },
    title: 'كيف حققت 500 XLM من مقالة واحدة',
    text: 'قبل شهرين نشرت مقالة طويلة عن تجربتي في ريادة الأعمال، وسككتها كـ NFT بسعر 5 XLM. اليوم جمعت أكثر من 500 XLM من المبيعات والدعم. إليكم القصة...',
    timestamp: 'منذ 6 ساعات',
    createdAt: Date.now() - 1000 * 60 * 360,
    likes: 445, replies: 67, recasts: 89,
    miniApp: 'nft-mint',
    miniAppData: {
      title: 'رحلتي في ريادة الأعمال الرقمية',
      previewText: 'بدأت رحلتي في 2022 بفكرة بسيطة: كيف يمكن للكتّاب العرب تحقيق دخل مستدام من محتواهم؟',
      authorName: 'ليلى حسن',
    },
  },
  {
    id: 'post-6',
    channelId: 'defi-mena',
    author: { name: 'خالد الراشد', address: 'GDEFG...JKL012', verified: true },
    title: 'فرص Yield Farming على Stellar — دليل شامل',
    text: 'كثيرون يسألون عن أفضل بروتوكولات العائد على Stellar. في هذا المنشور أشرح أهم البروتوكولات ومخاطرها وفوائدها بشكل موضوعي.',
    timestamp: 'منذ 2 ساعة',
    createdAt: Date.now() - 1000 * 60 * 120,
    likes: 230, replies: 55, recasts: 40,
  },
  {
    id: 'post-7',
    channelId: 'nft-artists',
    author: { name: 'فاطمة أحمد', address: 'GXYZ2...TEST2', verified: false },
    title: 'عملي الجديد: "جذور في الرمال" 🎨',
    text: 'أنهيت للتو لوحتي الرقمية الجديدة المستوحاة من التراث العربي. سأسكّها كـ NFT حصري على StellarScribe الأسبوع القادم!',
    timestamp: 'منذ يوم',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    likes: 178, replies: 32, recasts: 24,
    miniApp: 'tip-jar',
    miniAppData: {
      recipientName: 'فاطمة أحمد',
      recipientAddress: 'GXYZ2...TEST2',
    },
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

interface ChannelState {
  channels: Channel[];
  posts: ChannelPost[];
  joinedChannelIds: string[];

  // Actions
  addChannel: (channel: Channel) => void;
  addPost: (post: ChannelPost) => void;
  joinChannel: (id: string) => void;
  leaveChannel: (id: string) => void;
  likePost: (postId: string) => void;
  getChannelById: (id: string) => Channel | undefined;
  getPostsByChannel: (channelId: string) => ChannelPost[];
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set, get) => ({
      channels: SEED_CHANNELS,
      posts: SEED_POSTS,
      joinedChannelIds: [],

      addChannel: (channel) =>
        set((state) => ({ channels: [channel, ...state.channels] })),

      addPost: (post) =>
        set((state) => ({
          posts: [post, ...state.posts],
          channels: state.channels.map((c) =>
            c.id === post.channelId ? { ...c, postCount: c.postCount + 1 } : c
          ),
        })),

      joinChannel: (id) =>
        set((state) => {
          if (state.joinedChannelIds.includes(id)) return state;
          return {
            joinedChannelIds: [...state.joinedChannelIds, id],
            channels: state.channels.map((c) =>
              c.id === id ? { ...c, memberCount: c.memberCount + 1 } : c
            ),
          };
        }),

      leaveChannel: (id) =>
        set((state) => ({
          joinedChannelIds: state.joinedChannelIds.filter((cid) => cid !== id),
          channels: state.channels.map((c) =>
            c.id === id ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c
          ),
        })),

      likePost: (postId) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, likes: p.likes + 1 } : p
          ),
        })),

      getChannelById: (id) => get().channels.find((c) => c.id === id),

      getPostsByChannel: (channelId) =>
        get().posts.filter((p) => p.channelId === channelId),
    }),
    { name: 'stellarscribe-channels' }
  )
);
