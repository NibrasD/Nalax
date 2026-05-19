import { useState } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { Trophy, CheckCircle2, XCircle, Share2, Timer, Crown } from 'lucide-react';
import { useWallet } from '../../store/useWallet';

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

interface QuizMiniAppProps {
  title: string;
  questions: Question[];
  participants: number;
}

export function QuizMiniApp({ title, questions, participants }: QuizMiniAppProps) {
  const { isConnected } = useWallet();
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds per question

  const handleStart = () => {
    if (!isConnected) return;
    setStarted(true);
    // In a real app, we'd start a timer interval here
  };

  const handleSelect = (optionId: string, isCorrect: boolean) => {
    if (selectedOpt) return; // Prevent double click
    setSelectedOpt(optionId);
    
    if (isCorrect) setScore(s => s + 100);

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(c => c + 1);
        setSelectedOpt(null);
      } else {
        setFinished(true);
      }
    }, 1500);
  };

  const config = {
    id: 'quiz',
    name: 'Quiz Battle',
    name_ar: 'تحدي المعرفة',
    icon: '🏆',
    type: 'custom' as const,
    verified: true,
  };

  const currentQuestion = questions[currentQ];

  return (
    <MiniAppContainer config={config}>
      <div className="space-y-4">
        {!started ? (
          /* Start Screen */
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-[18px] font-bold text-[var(--color-text-main)] mb-2">{title}</h4>
            <p className="text-[13px] text-[var(--color-text-dim)] mb-6">
              تحدَّ أصدقاءك في هذا الاختبار السريع. {questions.length} أسئلة، 10 ثوانٍ لكل سؤال.
            </p>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <span className="block text-[16px] font-mono font-bold text-primary">{participants}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase">مشارك</span>
              </div>
              <div className="w-px h-8 bg-[var(--color-border)]" />
              <div className="text-center">
                <span className="block text-[16px] font-mono font-bold text-accent">500</span>
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase">جائزة (XLM)</span>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!isConnected}
              className="w-full py-3 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer bg-primary text-white hover:shadow-[0_0_20px_rgba(108,58,255,0.4)] disabled:opacity-50"
            >
              {isConnected ? 'ابدأ التحدي الآن 🚀' : 'اربط محفظتك للبدء'}
            </button>
          </div>
        ) : !finished ? (
          /* Quiz Screen */
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-mono text-[var(--color-text-dim)]">
                السؤال {currentQ + 1} / {questions.length}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[12px] font-mono font-bold">{timeLeft}s</span>
              </div>
            </div>

            <h4 className="text-[16px] font-semibold leading-relaxed mb-6">
              {currentQuestion.text}
            </h4>

            <div className="space-y-3">
              {currentQuestion.options.map(opt => {
                const isSelected = selectedOpt === opt.id;
                const showCorrectness = selectedOpt !== null;
                
                let btnClass = "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-primary/50";
                let Icon = null;

                if (showCorrectness) {
                  if (opt.isCorrect) {
                    btnClass = "border-[#00E87B] bg-[#00E87B]/10";
                    Icon = CheckCircle2;
                  } else if (isSelected && !opt.isCorrect) {
                    btnClass = "border-[var(--color-error)] bg-[var(--color-error)]/10";
                    Icon = XCircle;
                  } else {
                    btnClass = "border-[var(--color-border)] bg-[var(--color-surface)] opacity-50";
                  }
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id, opt.isCorrect)}
                    disabled={selectedOpt !== null}
                    className={`w-full relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                      selectedOpt === null ? 'cursor-pointer' : 'cursor-default'
                    } ${btnClass}`}
                  >
                    <span className="text-[14px] font-medium text-right">{opt.text}</span>
                    {Icon && (
                      <Icon className={`w-5 h-5 ${opt.isCorrect ? 'text-[#00E87B]' : 'text-[var(--color-error)]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Results Screen */
          <div className="text-center py-4 animate-slideUp">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00E87B] to-primary flex items-center justify-center shadow-[0_0_30px_rgba(0,232,123,0.3)]">
                <span className="text-[28px] font-mono font-bold text-black">{score}</span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[var(--color-bg-elevated)] p-1.5 rounded-full border border-[var(--color-border)]">
                <Crown className="w-5 h-5 text-[#FFD700]" />
              </div>
            </div>
            
            <h4 className="text-[20px] font-bold text-[var(--color-text-main)] mb-1">أداء مذهل!</h4>
            <p className="text-[13px] text-[var(--color-text-dim)] mb-6">
              ترتيبك الحالي: <strong className="text-primary">#14</strong> من أصل {participants}
            </p>

            <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] mb-6 text-right">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] text-[var(--color-text-muted)]">إجابات صحيحة</span>
                <span className="text-[14px] font-mono font-bold text-[#00E87B]">{score / 100} / {questions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-[var(--color-text-muted)]">المكافأة المتوقعة</span>
                <span className="text-[14px] font-mono font-bold text-accent">+15 XLM</span>
              </div>
            </div>

            <button className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-primary text-[var(--color-text-main)] hover:text-primary">
              <Share2 className="w-4 h-4" />
              تحدَّ أصدقاءك (شارك النتيجة)
            </button>
          </div>
        )}
      </div>
    </MiniAppContainer>
  );
}
