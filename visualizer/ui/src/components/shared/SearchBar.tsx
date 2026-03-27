"use client";
import { useState } from "react";
import { Search, Sparkles, ChevronUp } from "lucide-react";
import { askAI } from "@/hooks/useIncidents";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await askAI(query);
      setResult(res.answer);
      setExpanded(true);
    } catch {
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-surface-200 shadow-card overflow-hidden">
      <div className="flex items-center px-5 py-3.5">
        <Sparkles className="w-4 h-4 text-amber-500 mr-2.5 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="What would you like to explore next?"
          className="flex-1 text-[13px] text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
        />
        {result && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-surface-100 rounded-lg mr-1"
          >
            <ChevronUp
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "" : "rotate-180"}`}
            />
          </button>
        )}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="p-2 hover:bg-surface-100 rounded-xl transition-colors"
        >
          <Search className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      {result && expanded && (
        <div className="px-5 pb-4 border-t border-surface-200">
          <p className="text-[13px] text-gray-600 pt-3 leading-relaxed">{result}</p>
        </div>
      )}
    </div>
  );
}
