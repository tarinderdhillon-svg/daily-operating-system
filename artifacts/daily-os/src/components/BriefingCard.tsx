import React from "react";
import { useGetBriefing, useGenerateBriefing, getGetBriefingQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";

export function BriefingCard() {
  const { data: briefingResponse, isLoading } = useGetBriefing();
  const generateBriefing = useGenerateBriefing();
  const queryClient = useQueryClient();

  const handleGenerate = () => {
    generateBriefing.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBriefingQueryKey() })
    });
  };

  if (isLoading) {
    return <div className="glass-card rounded-2xl p-6 h-[400px] animate-pulse mb-6" />;
  }

  const briefing = briefingResponse?.briefing;

  if (!briefing) {
    return (
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
          <Zap className="text-blue-400" size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-200 mb-2">No Briefing Available</h3>
        <p className="text-sm text-slate-400 mb-6 max-w-sm">Generate your daily intelligence briefing to get the latest tech news and market updates tailored for you.</p>
        <button 
          onClick={handleGenerate}
          disabled={generateBriefing.isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {generateBriefing.isPending ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
          Generate Briefing
        </button>
      </div>
    );
  }

  const renderSection = (title: string, articles: any[], icon: React.ReactNode, accentColor: string) => (
    <div className="flex-1">
      <h3 className={`text-sm font-semibold tracking-wider uppercase mb-4 flex items-center gap-2 ${accentColor}`}>
        {icon} {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article, i) => (
          <a 
            key={i} 
            href={article.link}
            target="_blank"
            rel="noreferrer"
            className="group bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all flex flex-col h-full"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-slate-200 leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                {article.title}
              </h4>
              <ExternalLink size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">
              {article.source} • {article.date}
            </div>
            <p className="text-xs text-slate-400 flex-1 line-clamp-3 mb-3">
              {article.summary}
            </p>
            {article.key_metrics && (
              <div className="mt-auto inline-flex px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-300">
                {article.key_metrics}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div className="glass-card rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 leading-tight">Daily Intelligence</h2>
            <div className="text-xs text-slate-400">
              Updated {format(parseISO(briefing.generated_at), 'h:mm a')}
            </div>
          </div>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={generateBriefing.isPending}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={generateBriefing.isPending ? "animate-spin text-blue-400" : ""} size={16} />
          {generateBriefing.isPending ? "Updating..." : "Refresh"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {renderSection("AI & Tech", briefing.ai_tech, <Zap size={16} />, "text-indigo-400")}
        {renderSection("Business & Markets", briefing.business_markets, <TrendingUp size={16} />, "text-emerald-400")}
      </div>
    </div>
  );
}
