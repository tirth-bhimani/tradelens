import React from "react";
import { type PsychologicalTag, PSYCHOLOGICAL_TAGS } from "@/lib/trades/trade-filters";
import { X } from "lucide-react";

export interface TradeTagPillProps {
  tag: PsychologicalTag;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function TradeTagPill({
  tag,
  onRemove,
  className = "",
  size = "sm",
}: TradeTagPillProps) {
  const meta = PSYCHOLOGICAL_TAGS[tag];
  const isDisciplined = meta?.category === "disciplined";

  const colorStyles = isDisciplined
    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
    : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60";

  const sizeStyles =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      data-testid="trade-tag-pill"
      className={`inline-flex items-center gap-1 rounded-[3px] font-medium border ${colorStyles} ${sizeStyles} ${className} transition-colors`}
      title={meta?.description || tag}
    >
      <span className="w-1 h-1 rounded-full shrink-0 bg-current opacity-70" />
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-80 p-0.5 -mr-0.5"
          aria-label={`Remove tag ${tag}`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
