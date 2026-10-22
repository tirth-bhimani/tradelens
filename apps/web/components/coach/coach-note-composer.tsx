"use client";

import React, { useState } from "react";
import { MessageSquare, Lock, Globe, Tag, Send, Check } from "lucide-react";
import { addCoachNoteAction } from "@/lib/coach/coach-actions";
import type { CoachNote } from "@/lib/coach/coach-types";

interface CoachNoteComposerProps {
  traderId: string;
  traderName: string;
  initialNotes: CoachNote[];
  onNoteAdded?: (note: CoachNote) => void;
}

const COMMON_TAGS = ["sizing", "discipline", "tilt", "stoploss", "timing", "praise"];

export function CoachNoteComposer({
  traderId,
  traderName,
  initialNotes,
  onNoteAdded,
}: CoachNoteComposerProps) {
  const [notes, setNotes] = useState<CoachNote[]>(initialNotes);
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["discipline"]);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSuccessMessage(null);

    const res = await addCoachNoteAction({
      traderId,
      note: text.trim(),
      tags: selectedTags,
      isPrivate,
    });

    setIsSubmitting(false);

    if (res.success && res.note) {
      setNotes((prev) => [res.note!, ...prev]);
      setText("");
      setSuccessMessage("Note recorded successfully.");
      if (onNoteAdded) onNoteAdded(res.note);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Note Composition Box */}
      <form
        onSubmit={handleSubmit}
        className="card-luminous p-4 rounded-[8px] border border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#2b7fff]" />
            <span>Coaching Feedback for {traderName}</span>
          </span>

          {/* Privacy Toggle */}
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono transition ${
              isPrivate
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-blue-500/10 text-[#2b7fff] border border-blue-500/20"
            }`}
            title={isPrivate ? "Only coaches can read this note" : "Shared with mentee"}
          >
            {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            <span>{isPrivate ? "Private (Coach Only)" : "Shared with Mentee"}</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Record behavioral observations, discipline recommendations, or lot size guidelines...`}
          className="w-full text-xs p-3 rounded-[6px] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#090e1a] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#2b7fff] resize-none"
        />

        {/* Tag Selector & Submit Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3 h-3 text-slate-400 shrink-0" />
            {COMMON_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono transition ${
                    isSelected
                      ? "bg-[#2b7fff] text-white font-bold"
                      : "bg-slate-200/80 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="kiro-btn-cta !h-8 !px-3 text-xs font-semibold inline-flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            <span>{isSubmitting ? "Saving..." : "Add Note"}</span>
          </button>
        </div>

        {successMessage && (
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1 pt-1">
            <Check className="w-3 h-3" />
            <span>{successMessage}</span>
          </div>
        )}
      </form>

      {/* Historical Notes Timeline */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
          Notes History ({notes.length})
        </h4>

        {notes.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-200 dark:border-white/[0.08] rounded-[8px]">
            No coaching notes recorded yet. Add the first observation above.
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((n) => (
              <div
                key={n.id}
                className="p-3.5 rounded-[8px] border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#090e1a] shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {n.author_name || "Assigned Coach"}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(n.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] font-mono ${
                      n.is_private_to_coach
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-[#2b7fff] border border-blue-500/20"
                    }`}
                  >
                    {n.is_private_to_coach ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                    <span>{n.is_private_to_coach ? "Private" : "Shared"}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {n.note}
                </p>

                {n.tags && n.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {n.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 text-[10px] font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
