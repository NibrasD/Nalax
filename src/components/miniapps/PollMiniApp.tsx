import { useState } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { BarChart3, Check, Users } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollMiniAppProps {
  question: string;
  options: PollOption[];
}

export function PollMiniApp({ question, options: initialOptions }: PollMiniAppProps) {
  const [options, setOptions] = useState(initialOptions);
  const [voted, setVoted] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  const handleVote = (optionId: string) => {
    if (voted) return;
    setAnimating(true);
    setVoted(optionId);
    setOptions(prev =>
      prev.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
    );
    setTimeout(() => setAnimating(false), 600);
  };

  const config = {
    id: 'poll',
    name: 'Quick Poll',
    name_ar: 'استطلاع سريع',
    icon: '📊',
    type: 'poll' as const,
    verified: true,
  };

  return (
    <MiniAppContainer config={config}>
      <div className="space-y-3">
        {/* Question */}
        <h4 className="text-[15px] font-semibold text-[var(--color-text-main)] leading-relaxed">
          {question}
        </h4>

        {/* Options */}
        <div className="space-y-2">
          {options.map(option => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / (totalVotes + (voted ? 1 : 0))) * 100) : 0;
            const isSelected = voted === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={!!voted}
                className={`w-full relative overflow-hidden rounded-lg border transition-all duration-300 cursor-pointer text-right ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : voted
                    ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-primary/30 hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {/* Progress Bar Background */}
                {voted && (
                  <div
                    className={`absolute inset-y-0 right-0 transition-all duration-700 ease-out ${
                      isSelected ? 'bg-primary/15' : 'bg-[var(--color-surface-hover)]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    {voted && (
                      <span className={`text-[13px] font-mono font-semibold ${isSelected ? 'text-primary' : 'text-[var(--color-text-dim)]'}`}>
                        {percentage}%
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <span className={`text-[13px] ${isSelected ? 'font-semibold text-primary' : 'text-[var(--color-text-secondary)]'}`}>
                    {option.text}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Vote Count */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
            التصويت مسجل على السلسلة
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)]">
            <Users className="w-3 h-3" />
            <span>{totalVotes + (voted ? 1 : 0)} مصوّت</span>
          </div>
        </div>
      </div>
    </MiniAppContainer>
  );
}
