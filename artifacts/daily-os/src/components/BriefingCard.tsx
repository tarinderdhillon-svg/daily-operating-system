import React, { useState, useEffect } from "react";
import { useGetBriefing, useGenerateBriefing, getGetBriefingQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Zap, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Badge as BadgeIcon } from "lucide-react";
import { format, parseISO } from "date-fns";

export function BriefingCard() {
  const { data: briefingResponse, isLoading } = useGetBriefing();
  const generateBriefing = useGenerateBriefing();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerate = () => {
    generateBriefing.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBriefingQueryKey() }),
    });
  };

  if (isLoading) {
    return (
      <div className="bento-card rounded-3xl p-6 h-[88px] animate-pulse" />
    );
  }

  const briefing = briefingResponse?.briefing;

  if (!briefing) {
    return (
      <div className="bento-card rounded-3xl p-5 flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">Daily Briefing</h2>
          <p className="text-xs text-slate-500 mt-0.5">No briefing yet — press Generate to get today's news</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generateBriefing.isPending}
          className="shrink-0 bg-indigo-600/80 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {generateBriefing.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {generateBriefing.isPending ? "Generating…" : "Generate"}
        </button>
      </div>
    );
  }

  const topAiTech = briefing.ai_tech?.[0];
  const topBusiness = briefing.business_markets?.[0];

  return (
    <div className="bento-card rounded-3xl overflow-hidden relative group hover:border-indigo-500/30 transition-colors">
      {/* Corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/0 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Header row — always visible */}
      <div className="flex items-center gap-3 p-5 pb-4 relative">
        <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">Daily Briefing</h2>
            <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-500/20">AI Generated</span>
            <span className="text-[10px] text-slate-500">
              {format(parseISO(briefing.generated_at), "h:mm a")}
            </span>
          </div>

          {/* Collapsed summary: show first headline from each category */}
          {!isExpanded && (
            <div className="flex flex-col md:flex-row gap-2 mt-2">
              {topAiTech && (
                <a
                  href={topAiTech.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-start gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors group/link"
                  onClick={e => e.stopPropagation()}
                >
                  <Zap className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1 group-hover/link:text-indigo-300">
                    <span className="text-indigo-400/70 font-medium">AI/Tech: </span>{topAiTech.title}
                  </span>
                </a>
              )}
              {topBusiness && (
                <a
                  href={topBusiness.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-start gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors group/link"
                  onClick={e => e.stopPropagation()}
                >
                  <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1 group-hover/link:text-emerald-300">
                    <span className="text-emerald-400/70 font-medium">Markets: </span>{topBusiness.title}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Controls — aligned with header row */}
        <div className="flex items-center gap-1.5 shrink-0 self-start">
          <button
            onClick={handleGenerate}
            disabled={generateBriefing.isPending}
            title="Refresh briefing"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all disabled:opacity-40 text-[11px] font-medium border border-white/[0.06]"
          >
            <RefreshCw className={`h-3 w-3 ${generateBriefing.isPending ? "animate-spin text-indigo-400" : ""}`} />
            <span className="hidden sm:inline">{generateBriefing.isPending ? "Generating…" : "Refresh"}</span>
          </button>
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-500 hover:text-indigo-300 transition-all text-[11px] font-medium border border-white/[0.06]"
          >
            {isExpanded ? (
              <><ChevronUp className="h-3 w-3" /><span className="hidden sm:inline">Collapse</span></>
            ) : (
              <><ChevronDown className="h-3 w-3" /><span className="hidden sm:inline">Full briefing</span></>
            )}
          </button>
        </div>
      </div>

      {/* Expanded full briefing */}
      {isExpanded && (
        <div className="px-5 pb-6 border-t border-white/[0.04] pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI & Tech */}
            <div>
              <h3 className="text-xs font-bold tracking-widest uppercase text-indigo-400 mb-3 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" /> AI & Technology
              </h3>
              <div className="space-y-3">
                {briefing.ai_tech.map((article: any, i: number) => (
                  <a
                    key={i}
                    href={article.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group block bg-white/[0.02] hover:bg-indigo-500/5 border border-white/[0.05] hover:border-indigo-500/20 rounded-2xl p-3.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-slate-200 leading-snug group-hover:text-indigo-300 transition-colors">
                        {article.title}
                      </h4>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">
                      {article.source} · {article.date}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{article.summary}</p>
                    {article.key_metrics && (
                      <div className="mt-2 inline-flex px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">
                        {article.key_metrics}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>

            {/* Business & Markets */}
            <div>
              <h3 className="text-xs font-bold tracking-widest uppercase text-emerald-400 mb-3 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" /> Business & Markets
              </h3>
              <div className="space-y-3">
                {briefing.business_markets.map((article: any, i: number) => (
                  <a
                    key={i}
                    href={article.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group block bg-white/[0.02] hover:bg-emerald-500/5 border border-white/[0.05] hover:border-emerald-500/20 rounded-2xl p-3.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-slate-200 leading-snug group-hover:text-emerald-300 transition-colors">
                        {article.title}
                      </h4>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">
                      {article.source} · {article.date}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{article.summary}</p>
                    {article.key_metrics && (
                      <div className="mt-2 inline-flex px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-300">
                        {article.key_metrics}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
