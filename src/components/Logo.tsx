/**
 * Nalax Logo — geometric "N" mark with stellar spark
 * ─────────────────────────────────────────────────────
 * Custom SVG mark (no external icon library) so the brand stays consistent
 * regardless of icon-pack updates.
 *
 * Design intent:
 *   • Rounded gradient square = the page / canvas (publishing).
 *   • Stroked "N" = the writer's hand on the page.
 *   • Small dot in the corner = a "stellar spark", evoking the Stellar
 *     network the platform settles on.
 *
 * The component is purely visual — no text. Pair it with the wordmark
 * separately when needed (see Navbar / Footer).
 */

import { CSSProperties } from 'react';

interface LogoProps {
  /** Pixel size of the square mark. Defaults to 36. */
  size?: number;
  /** Optional className for the outer wrapper. */
  className?: string;
  /** Optional inline style for the outer wrapper. */
  style?: CSSProperties;
  /**
   * If `true`, renders only the inner glyph in `currentColor` (no gradient
   * background). Useful for monochrome contexts like inline text.
   */
  monochrome?: boolean;
}

export function Logo({ size = 36, className = '', style, monochrome = false }: LogoProps) {
  // Unique gradient id so multiple <Logo /> on the same page don't collide.
  const gradId = `nalax-grad-${size}`;

  if (monochrome) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <path
          d="M10 22 L10 10 L22 22 L22 10"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25.5" cy="7" r="1.6" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-accent)" />
        </linearGradient>
      </defs>

      {/* Page / canvas */}
      <rect x="2" y="2" width="28" height="28" rx="8.5" fill={`url(#${gradId})`} />

      {/* Subtle highlight on top edge to catch the light */}
      <rect
        x="2"
        y="2"
        width="28"
        height="14"
        rx="8.5"
        fill="white"
        opacity="0.08"
      />

      {/* "N" letterform stroke */}
      <path
        d="M10 22 L10 10 L22 22 L22 10"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Stellar spark — small filled dot, slightly off-edge */}
      <circle cx="25.5" cy="7" r="1.6" fill="white" opacity="0.95" />
    </svg>
  );
}

/**
 * Wordmark — "Nalax" with a subtle gradient on the last syllable.
 * Use alongside <Logo /> for the full lockup.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-serif tracking-[-0.5px] text-[var(--color-text-main)] ${className}`}>
      Na<span className="text-gradient">lax</span>
    </span>
  );
}
