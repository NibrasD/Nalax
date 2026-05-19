import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ArticleStatus = 'draft' | 'minting' | 'minted' | 'failed';

export interface Article {
  id: string;
  tokenId?: number;
  title: string;
  excerpt: string;
  content: string;
  authorPublicKey: string;
  authorName?: string;
  createdAt: number;
  contentHash?: string;
  isTokenGated: boolean;
  price?: number;
  totalRaised?: number;
  accessCount?: number;
  tipCount?: number;
  featuredImage?: string;
  crowdfundingGoal?: number;
  status: ArticleStatus;
  tags?: string[];
  readTime?: string;
  txHash?: string;
}

export interface AuthorOnChain {
  address: string;
  name: string;
  bio: string;
  articleCount: number;
  totalEarned: number;
  registeredAt: number;
}

interface AppState {
  articles: Article[];
  registeredAuthor: AuthorOnChain | null;
  addArticle: (article: Article) => void;
  updateArticle: (id: string, updates: Partial<Article>) => void;
  fundArticle: (id: string, amount: number) => void;
  tipArticle: (id: string, amount: number) => void;
  setRegisteredAuthor: (author: AuthorOnChain | null) => void;
  clearAllLocalData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      articles: [],
      registeredAuthor: null,

      addArticle: (article) => set((state) => ({ 
        articles: [article, ...state.articles] 
      })),

      updateArticle: (id, updates) => set((state) => ({
        articles: state.articles.map(a => a.id === id ? { ...a, ...updates } : a)
      })),

      fundArticle: (id, amount) => set((state) => ({
        articles: state.articles.map(a => 
          a.id === id ? { ...a, totalRaised: (a.totalRaised || 0) + amount } : a
        )
      })),

      tipArticle: (id, amount) => set((state) => ({
        articles: state.articles.map(a => 
          a.id === id ? { 
            ...a, 
            totalRaised: (a.totalRaised || 0) + amount,
            tipCount: (a.tipCount || 0) + 1,
          } : a
        )
      })),

      setRegisteredAuthor: (author) => set({ registeredAuthor: author }),
      
      clearAllLocalData: () => set({ articles: [], registeredAuthor: null }),
    }),
    {
      name: 'stellarscribe-storage',
    }
  )
);
