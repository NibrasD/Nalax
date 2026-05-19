import { useState } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { Flame, BookOpen, Calendar, Share2, Award } from 'lucide-react';
import { useWallet } from '../../store/useWallet';

interface StreakMiniAppProps {
  challengeName: string;
  targetDays: number;
  participants: number;
}

export function StreakMiniApp({ challengeName, targetDays, participants }: StreakMiniAppProps) {
  const { isConnected } = useWallet();
  const [currentStreak, setCurrentStreak] = useState(4);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    if (!isConnected || checkedInToday) return;
    setCheckingIn(true);
    // Simulate blockchain transaction for daily proof
    await new Promise(r => setTimeout(r, 1500));
    setCheckedInToday(true);
    setCurrentStreak(s => s + 1);
    setCheckingIn(false);
  };

  const config = {
    id: 'streak',
    name: 'Reading Challenge',
    name_ar: 'تحدي القراءة',
    icon: '🔥',
    type: 'custom' as const,
    verified: true,
  };

  // Generate an array for the last 7 days visual
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    // Just a visual mock: first 4 days checked, 5th is today (if checkedInToday), rest empty
    if (i < 4) return true;
    if (i === 4) return checkedInToday;
    return false;
  });

  return (
    <MiniAppContainer config={config}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-[16px] font-bold text-[var(--color-text-main)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {challengeName}
            </h4>
            <p className="text-[12px] text-[var(--color-text-dim)] mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              تحدي {targetDays} يوم • {participants.toLocaleString()} مشارك
            </p>
          </div>
          <div className="bg-gradient-to-b from-[#FF5722]/20 to-transparent p-3 rounded-2xl border border-[#FF5722]/30 flex flex-col items-center justify-center min-w-[70px]">
            <Flame className={`w-6 h-6 mb-1 ${checkedInToday ? 'text-[#FF5722] fill-[#FF5722] animate-pulse' : 'text-[#FF5722]/50'}`} />
            <span className="text-[18px] font-mono font-bold text-[#FF5722] leading-none">{currentStreak}</span>
            <span className="text-[9px] uppercase font-bold text-[#FF5722]/70 mt-1 tracking-widest">أيام</span>
          </div>
        </div>

        {/* 7-Day Tracker */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-[var(--color-text-muted)]">سلسلة هذا الأسبوع</span>
            {checkedInToday && (
              <span className="text-[10px] text-[#00E87B] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E87B]" /> تم التسجيل اليوم
              </span>
            )}
          </div>
          <div className="flex justify-between items-center gap-1.5">
            {last7Days.map((isChecked, i) => (
              <div 
                key={i} 
                className={`flex-1 aspect-square rounded-lg flex items-center justify-center transition-all duration-500 ${
                  isChecked 
                    ? 'bg-gradient-to-br from-[#FF5722] to-[#FF8A65] shadow-[0_0_10px_rgba(255,87,34,0.3)]' 
                    : i === 4 && !checkedInToday
                    ? 'bg-[var(--color-surface)] border-2 border-dashed border-[#FF5722]/40 animate-pulse'
                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] opacity-50'
                }`}
              >
                {isChecked && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
            ))}
          </div>
        </div>

        {/* Reward Progress */}
        <div className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[var(--color-text-dim)] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-accent" />
              شارة {targetDays} يوم (NFT)
            </span>
            <span className="text-[11px] font-mono text-[var(--color-text-main)]">
              {Math.round((currentStreak / targetDays) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[var(--color-bg-base)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#FF5722] to-accent transition-all duration-1000 ease-out"
              style={{ width: `${(currentStreak / targetDays) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleCheckIn}
            disabled={!isConnected || checkedInToday || checkingIn}
            className={`flex-1 py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
              checkedInToday
                ? 'bg-[var(--color-surface)] text-[var(--color-text-dim)] border border-[var(--color-border)]'
                : 'bg-gradient-to-r from-[#FF5722] to-[#FF8A65] text-white hover:shadow-[0_0_20px_rgba(255,87,34,0.4)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {checkingIn ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : checkedInToday ? (
              'تم إثبات القراءة اليوم 📖'
            ) : (
              'سجّل قراءة اليوم (On-Chain)'
            )}
          </button>
          
          <button className="p-3 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-primary text-[var(--color-text-dim)] hover:text-primary transition-colors cursor-pointer">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </MiniAppContainer>
  );
}

// Dummy check icon since we didn't import it at the top
function CheckCircle(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
