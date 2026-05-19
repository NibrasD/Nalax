import { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, X, Zap, Shield } from 'lucide-react';

export interface MiniAppConfig {
  id: string;
  name: string;
  name_ar: string;
  icon: string;
  type: 'tip-jar' | 'poll' | 'nft-mint' | 'custom';
  verified: boolean;
}

interface MiniAppContainerProps {
  config: MiniAppConfig;
  children: React.ReactNode;
  onClose?: () => void;
}

export function MiniAppContainer({ config, children, onClose }: MiniAppContainerProps) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative border border-primary/20 rounded-xl overflow-hidden transition-all duration-500 ${
        expanded ? 'fixed inset-4 z-50 bg-[var(--color-bg-elevated)]' : ''
      }`}
    >
      {/* MiniApp Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--color-text-main)]">
                {config.name_ar || config.name}
              </span>
              {config.verified && (
                <Shield className="w-3 h-3 text-accent" />
              )}
            </div>
            <span className="text-[9px] font-mono text-primary uppercase tracking-wider">
              MiniApp
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md hover:bg-white/5 text-[var(--color-text-dim)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/5 text-[var(--color-text-dim)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MiniApp Body */}
      <div className={`transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${expanded ? 'p-6' : 'p-4'}`}>
        {children}
      </div>

      {/* Glow Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
