import React from "react";
import { 
  Terminal, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  MessageSquare, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Circle,
  ChevronRight,
  Command,
  Cpu,
  Zap
} from "lucide-react";

export function AmberTerminal() {
  return (
    <div className="min-h-screen bg-[#111111] text-amber-500 font-mono flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* TOP STRIP: BRIEFING TICKER & CALENDAR */}
      <header className="flex-none border-b border-amber-500/20 bg-[#161616]">
        {/* Briefing Ticker */}
        <div className="flex items-center px-4 py-2 text-xs border-b border-amber-500/10 overflow-hidden relative">
          <div className="flex items-center gap-2 pr-4 border-r border-amber-500/20 shrink-0 text-amber-600">
            <Zap className="w-3 h-3" />
            <span className="uppercase tracking-widest font-bold">Sys.Brief</span>
          </div>
          <div className="whitespace-nowrap overflow-hidden text-amber-500/80 pl-4 animate-[pulse_4s_ease-in-out_infinite]">
            <span className="opacity-50 mr-2">&gt;</span>
            Tech markets rally on new AI infrastructure announcements. Nvidia and TSMC post strong quarterly guidance. 
            European Union finalizes draft of the new AI compliance framework, likely affecting Q3 deployment timelines. 
            Local weather: Overcast, 62°F. Traffic light on 101-N.
          </div>
        </div>

        {/* Calendar Strip */}
        <div className="flex items-center px-4 py-3 gap-6 text-sm">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-amber-500/10 p-1.5 rounded text-amber-400 border border-amber-500/20">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold uppercase tracking-wider text-amber-400">Apr 11</div>
              <div className="text-xs text-amber-600">Today</div>
            </div>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar flex-1">
            <div className="flex flex-col border-l-2 border-amber-500/40 pl-3 pr-6 py-0.5">
              <span className="text-amber-200 font-medium">10:00 AM</span>
              <span className="text-xs text-amber-500/70 truncate">Product Sync w/ Design</span>
            </div>
            <div className="flex flex-col border-l-2 border-red-500/40 pl-3 pr-6 py-0.5 bg-red-500/5 rounded-r">
              <span className="text-red-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                11:30 AM
              </span>
              <span className="text-xs text-red-500/70 truncate">Q1 Board Prep (Urgent)</span>
            </div>
            <div className="flex flex-col border-l-2 border-amber-500/20 pl-3 pr-6 py-0.5 opacity-60">
              <span className="text-amber-200 font-medium">2:00 PM</span>
              <span className="text-xs text-amber-500/70 truncate">Interview: Lead Engineer</span>
            </div>
            <div className="flex flex-col border-l-2 border-amber-500/20 pl-3 pr-6 py-0.5 opacity-60">
              <span className="text-amber-200 font-medium">4:30 PM</span>
              <span className="text-xs text-amber-500/70 truncate">Deep Work Block</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: TASKS */}
        <aside className="w-[280px] border-r border-amber-500/20 bg-[#141414] flex flex-col shrink-0">
          <div className="p-3 border-b border-amber-500/10 flex items-center justify-between text-xs font-bold tracking-widest text-amber-600 uppercase">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Queue</span>
            </div>
            <span className="bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-400">12</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            
            {/* Overdue */}
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </h3>
              <div className="group flex items-start gap-2 p-2 -mx-2 rounded hover:bg-amber-500/5 cursor-pointer transition-colors">
                <Circle className="w-3.5 h-3.5 mt-0.5 text-red-500 shrink-0" />
                <div className="text-xs text-amber-200/90 leading-relaxed">Fix Navaigate onboarding bug</div>
              </div>
            </div>

            {/* In Progress */}
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                <Command className="w-3 h-3" />
                Active
              </h3>
              <div className="group flex items-start gap-2 p-2 -mx-2 rounded bg-amber-500/10 border border-amber-500/20 cursor-pointer">
                <Clock className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0 animate-pulse" />
                <div className="text-xs text-amber-200 leading-relaxed font-medium">Review Microsoft training deck</div>
              </div>
            </div>

            {/* Due Soon */}
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                Upcoming
              </h3>
              <div className="group flex items-start gap-2 p-2 -mx-2 rounded hover:bg-amber-500/5 cursor-pointer transition-colors">
                <Circle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-400/80 leading-relaxed">Call accountant re: Q1 tax</div>
              </div>
              <div className="group flex items-start gap-2 p-2 -mx-2 rounded hover:bg-amber-500/5 cursor-pointer transition-colors">
                <Circle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-400/80 leading-relaxed">Send team update</div>
              </div>
              <div className="group flex items-start gap-2 p-2 -mx-2 rounded hover:bg-amber-500/5 cursor-pointer transition-colors">
                <Circle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-400/80 leading-relaxed">Approve Q2 budget proposal</div>
              </div>
            </div>

            {/* Completed */}
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest text-amber-500/40 font-bold mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Done
              </h3>
              <div className="group flex items-start gap-2 p-2 -mx-2 rounded opacity-40">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="text-xs line-through leading-relaxed">Morning standup</div>
              </div>
            </div>

          </div>
        </aside>

        {/* HERO: AI COMMAND CENTER */}
        <main className="flex-1 flex flex-col bg-[#111111] relative">
          
          {/* Subtle grid background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#f59e0b_1px,transparent_1px),linear-gradient(to_bottom,#f59e0b_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

          {/* Chat Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-amber-500/10 z-10 bg-[#111111]/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-amber-500 text-[#111111] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-amber-400 font-bold text-lg leading-tight shadow-amber-500/20 drop-shadow-md">OS.Agent</h1>
                <div className="text-[10px] text-amber-600 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Online & Ready
                </div>
              </div>
            </div>
            <div className="text-xs text-amber-600/50">
              Session ID: a7x-992-b
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 z-10">
            
            {/* AI Message */}
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 rounded shrink-0 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mt-1">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="text-[10px] text-amber-600 uppercase tracking-widest font-bold">OS.Agent <span className="text-amber-700 font-normal ml-2">09:41 AM</span></div>
                <div className="text-sm text-amber-200/90 leading-relaxed">
                  Good morning, Tarinder. I've compiled your daily briefing above.
                  <br /><br />
                  Notice: You have an urgent board prep meeting at 11:30 AM. Would you like me to pull up the Q4 metrics deck for your review?
                </div>
              </div>
            </div>

            {/* User Message */}
            <div className="flex gap-4 max-w-3xl ml-auto flex-row-reverse">
              <div className="w-8 h-8 rounded shrink-0 bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 mt-1">
                <span className="font-bold text-xs">TD</span>
              </div>
              <div className="space-y-2 pt-2 text-right">
                <div className="text-[10px] text-amber-600 uppercase tracking-widest font-bold"><span className="text-amber-700 font-normal mr-2">09:45 AM</span> Guest</div>
                <div className="text-sm text-amber-100 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-l-lg rounded-br-lg inline-block text-left">
                  Yes, open the metrics deck. Also, can you add a task to email Sarah about the hiring timeline before 2 PM?
                </div>
              </div>
            </div>

            {/* AI Message */}
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 rounded shrink-0 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mt-1">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="space-y-4 pt-2">
                <div className="text-[10px] text-amber-600 uppercase tracking-widest font-bold">OS.Agent <span className="text-amber-700 font-normal ml-2">09:45 AM</span></div>
                <div className="text-sm text-amber-200/90 leading-relaxed">
                  Done. The metrics deck is opening in your workspace now.
                </div>
                
                {/* Embedded Widget / Action taken */}
                <div className="bg-[#181818] border border-amber-500/20 rounded p-3 flex items-start gap-3 w-80">
                  <div className="bg-amber-500/20 p-1.5 rounded text-amber-400 mt-0.5">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-amber-500/60 uppercase tracking-widest mb-1 font-bold">Task Created</div>
                    <div className="text-sm text-amber-200">Email Sarah re: hiring timeline</div>
                    <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due today, 2:00 PM
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Input Area */}
          <div className="p-6 pt-0 z-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-amber-500/20 blur-md rounded group-focus-within:bg-amber-500/30 transition-all opacity-50"></div>
              <div className="relative bg-[#0a0a0a] border border-amber-500/40 focus-within:border-amber-400 rounded-lg flex items-center p-1 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <div className="pl-4 pr-2 text-amber-500 font-bold animate-pulse">
                  &gt;
                </div>
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border-none outline-none text-amber-100 placeholder:text-amber-700/50 py-3 text-sm"
                  placeholder="Enter command or chat..."
                  defaultValue=""
                />
                <button className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-4 py-2 rounded transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1 mr-1">
                  Exec <Command className="w-3 h-3" />
                </button>
              </div>
              <div className="mt-2 text-[10px] text-amber-700 flex gap-4 pl-4 uppercase tracking-widest">
                <span><kbd className="font-sans border border-amber-800 rounded px-1 py-0.5 text-amber-600 mr-1">⌘</kbd> + <kbd className="font-sans border border-amber-800 rounded px-1 py-0.5 text-amber-600 mr-1">K</kbd> Quick Action</span>
                <span><kbd className="font-sans border border-amber-800 rounded px-1 py-0.5 text-amber-600 mr-1">↑</kbd> History</span>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
