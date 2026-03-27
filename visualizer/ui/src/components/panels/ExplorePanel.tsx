"use client";
import { useState } from "react";
import { Mic, Send, Sparkles, ChevronUp } from "lucide-react";
import { askAI } from "@/hooks/useIncidents";

export default function ExplorePanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const result = await askAI(question);
      setAnswer(result.answer);
    } catch {
      setAnswer("Unable to analyze at this time.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[13px] font-semibold text-gray-700">
            What would you like to explore next?
          </span>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "" : "rotate-180"}`}
        />
      </button>

      {expanded && (
        <div className="px-6 pb-5">
          {/* Input with tag-style entities */}
          <div className="relative mb-3">
            <div className="flex items-center gap-1.5 w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-2xl focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-300 transition-all">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="I want to know what caused the drop-off from"
                className="flex-1 text-[13px] text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
              />
              {question && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[11px] font-semibold flex-shrink-0">
                  /query
                </span>
              )}
              <button
                onClick={handleAsk}
                disabled={loading}
                className="p-1 hover:bg-surface-200 rounded-lg transition-colors flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Answer */}
          {answer && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-3 text-[13px] text-gray-700 leading-relaxed">
              {answer}
            </div>
          )}

          {/* Ask AI button */}
          <button
            onClick={handleAsk}
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-2xl py-3.5 text-[13px] font-semibold hover:bg-gray-800 active:bg-gray-950 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Mic className="w-4 h-4" />
            {loading ? "Analyzing..." : "Ask AI"}
          </button>
        </div>
      )}
    </div>
  );
}
