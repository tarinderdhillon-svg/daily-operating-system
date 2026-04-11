import { TasksCard } from "@/components/TasksCard";
import { CalendarCard } from "@/components/CalendarCard";
import { BriefingCard } from "@/components/BriefingCard";
import { ChatPanel } from "@/components/ChatPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Activity } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen p-6 font-sans selection:bg-blue-500/30">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column - 60% */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <header className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Daily Operating System
              </h1>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-mono font-medium">
                <Activity size={14} /> SYSTEM NOMINAL
              </div>
            </div>
            <p className="text-slate-400 font-mono text-sm tracking-wide">Tasks • Calendar • Intelligence</p>
          </header>

          <ErrorBoundary name="Schedule">
            <CalendarCard />
          </ErrorBoundary>

          <ErrorBoundary name="Daily Briefing">
            <BriefingCard />
          </ErrorBoundary>

          <ErrorBoundary name="Tasks">
            <TasksCard />
          </ErrorBoundary>
        </div>

        {/* Right Column - 40% */}
        <div className="lg:col-span-5 xl:col-span-4">
          <ErrorBoundary name="Chat">
            <ChatPanel />
          </ErrorBoundary>
        </div>

      </div>
    </div>
  );
}
