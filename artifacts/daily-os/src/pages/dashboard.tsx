import { lazy, Suspense } from "react";
import { TasksCard }     from "@/components/TasksCard";
import { CalendarCard }  from "@/components/CalendarCard";
import { BriefingCard }  from "@/components/BriefingCard";
import { ChatPanel }     from "@/components/ChatPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { format }        from "date-fns";

// Lazy-load the Learning card — it's below the fold and not critical at startup
const LearningCard = lazy(() =>
  import("@/components/LearningCard").then(m => ({ default: m.LearningCard }))
);

function LearningFallback() {
  return (
    <div className="bento-card rounded-3xl p-5 h-28 animate-pulse flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-white/[0.04] rounded-full w-1/3" />
        <div className="h-2 bg-white/[0.03] rounded-full w-2/3" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen bg-[#0a0a14] text-slate-200 p-4 md:p-6 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">

      {/* Background glows — hidden on mobile (too GPU-heavy for Safari) */}
      <div className="hidden lg:block fixed top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="hidden lg:block fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-0.5">
              {greeting}, Tarinder
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-[#0a0a14]">
              TD
            </div>
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Chat Sidebar — spans all rows on the right */}
          <div className="lg:col-start-9 lg:col-span-4 lg:row-start-1 lg:row-span-4 order-last lg:order-none">
            <ErrorBoundary name="Chat">
              <ChatPanel />
            </ErrorBoundary>
          </div>

          {/* Briefing */}
          <div className="lg:col-start-1 lg:col-span-8 lg:row-start-1">
            <ErrorBoundary name="Daily Briefing">
              <BriefingCard />
            </ErrorBoundary>
          </div>

          {/* Calendar */}
          <div className="lg:col-start-1 lg:col-span-8 lg:row-start-2">
            <ErrorBoundary name="Schedule">
              <CalendarCard />
            </ErrorBoundary>
          </div>

          {/* Tasks */}
          <div className="lg:col-start-1 lg:col-span-8 lg:row-start-3 lg:row-span-2">
            <ErrorBoundary name="Tasks">
              <TasksCard />
            </ErrorBoundary>
          </div>

          {/* Learning Module — lazy loaded, below the fold */}
          <div className="lg:col-start-1 lg:col-span-8 lg:row-start-5">
            <ErrorBoundary name="Learning">
              <Suspense fallback={<LearningFallback />}>
                <LearningCard />
              </Suspense>
            </ErrorBoundary>
          </div>

        </div>
      </div>
    </div>
  );
}
