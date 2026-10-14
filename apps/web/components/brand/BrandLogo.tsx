import Image from "next/image";
import Link from "next/link";

export interface BrandLogoProps {
  /**
   * Display mode:
   * - "horizontal": Emblem image + stylized typography next to it (ideal for navbars)
   * - "mark": Just the emblem icon image
   * - "full": Full stacked emblem + text image
   */
  variant?: "horizontal" | "mark" | "full";
  /** Height in pixels or sizing preset */
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional link destination (defaults to "/", set to null or false to disable link) */
  href?: string | null;
  /** Extra class name for container */
  className?: string;
  /** Whether to show text next to mark in horizontal mode */
  withText?: boolean;
}

const SIZE_CONFIGS = {
  sm: { markSize: 30, fullHeight: 38, textSize: "text-lg" },
  md: { markSize: 40, fullHeight: 52, textSize: "text-2xl" },
  lg: { markSize: 52, fullHeight: 64, textSize: "text-3xl" },
  xl: { markSize: 68, fullHeight: 84, textSize: "text-4xl" },
};

export function BrandLogo({
  variant = "horizontal",
  size = "md",
  href = "/",
  className = "",
  withText = true,
}: BrandLogoProps) {
  const config = SIZE_CONFIGS[size];

  const content = (() => {
    if (variant === "full") {
      return (
        <div className={`relative inline-flex items-center ${className}`}>
          {/* Light Theme Full Logo */}
          <Image
            src="/brand/logo-light.png"
            alt="TradeLens"
            width={config.fullHeight * 1.5}
            height={config.fullHeight}
            className="dark:hidden h-auto object-contain transition-opacity duration-200"
            priority
          />
          {/* Dark Theme Full Logo (with Cyan Glow) */}
          <Image
            src="/brand/logo-dark.png"
            alt="TradeLens"
            width={config.fullHeight * 1.5}
            height={config.fullHeight}
            className="hidden dark:block h-auto object-contain transition-opacity duration-200"
            priority
          />
        </div>
      );
    }

    if (variant === "mark") {
      return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
          {/* Light Theme Mark */}
          <Image
            src="/brand/icon-square-light.png"
            alt="TradeLens"
            width={config.markSize}
            height={config.markSize}
            className="dark:hidden object-contain transition-transform duration-200 group-hover:scale-105"
            priority
          />
          {/* Dark Theme Mark (with Cyan Glow) */}
          <Image
            src="/brand/icon-square-dark.png"
            alt="TradeLens"
            width={config.markSize}
            height={config.markSize}
            className="hidden dark:block object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]"
            priority
          />
        </div>
      );
    }

    // Default: "horizontal" (Icon mark with clean, modern TradeLens typography)
    return (
      <div className={`flex items-center space-x-2.5 group ${className}`}>
        {/* Emblem Mark with dynamic theme adaptation */}
        <div
          className="relative flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ width: config.markSize, height: config.markSize }}
        >
          {/* Light Theme Mark */}
          <Image
            src="/brand/icon-square-light.png"
            alt="TradeLens Icon"
            width={config.markSize}
            height={config.markSize}
            className="dark:hidden w-full h-full object-contain"
            priority
          />
          {/* Dark Theme Mark with cyan neon glow */}
          <Image
            src="/brand/icon-square-dark.png"
            alt="TradeLens Icon"
            width={config.markSize}
            height={config.markSize}
            className="hidden dark:block w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            priority
          />
        </div>

        {withText && (
          <div className="flex items-baseline">
            <span
              className={`${config.textSize} font-bold tracking-tight text-slate-900 dark:text-white transition-colors`}
            >
              Trade
            </span>
            <span
              className={`${config.textSize} font-bold tracking-tight text-[#387ed1] dark:text-[#38bdf8] transition-colors`}
            >
              Lens
            </span>
          </div>
        )}
      </div>
    );
  })();

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
