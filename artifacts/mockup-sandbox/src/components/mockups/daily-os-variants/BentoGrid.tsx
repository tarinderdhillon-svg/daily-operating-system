import React from "react";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  Send,
  MoreHorizontal,
  ArrowRight,
  Zap,
  Coffee,
  Sun,
  PlayCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Static Data
const TASKS = [
  { id: 1, title: "Review Microsoft training deck", status: "overdue", time: "10:00 AM", tag: "Work" },
  { id: 2, title: "Call accountant re: Q1 tax", status: "soon", time: "2:00 PM", tag: "Personal" },
  { id: 3, title: "Fix Navigate onboarding bug", status: "in-progress", time: "Today", tag: "Engineering" },
  { id: 4, title: "Send team update", status: "not-started", time: "Tomorrow", tag: "Management" },
  { id: 5, title: "Weekly sync prep", status: "not-started", time: "Tomorrow", tag: "Work" },
];

const EVENTS = [
  { id: 1, title: "Product Sync", time: "10:00 - 11:00", type: "meeting", attendees: ["JD", "AS"] },
  { id: 2, title: "Deep Work: Design Review", time: "13:00 - 15:00", type: "focus", attendees: [] },
  { id: 3, title: "1:1 with Sarah", time: "16:00 - 16:30", type: "meeting", attendees: ["SJ"] },
];

const CHAT = [
  { role: "assistant", content: "Good morning! You have 3 meetings today and 1 overdue task." },
  { role: "user", content: "Can you summarize the Microsoft deck for me?" },
  { role: "assistant", content: "I've reviewed the deck. It focuses on the Q3 roadmap, particularly the new Azure integrations and Copilot extensions. The main takeaway is the shift towards enterprise AI features." },
];

export function BentoGrid() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Background Noise & Glows */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Good morning, Tarinder</h1>
            <p className="text-slate-400 font-medium">Thursday, April 11</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-full">
              <Sun className="h-4 w-4" />
            </Button>
            <Avatar className="h-10 w-10 ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-[#0a0a14]">
              <AvatarImage src="https://i.pravatar.cc/150?u=tarinder" />
              <AvatarFallback className="bg-indigo-900 text-indigo-200">TD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 grid-rows-[auto_auto_auto]">
          
          {/* Briefing Card (Thin, Top) */}
          <div className="md:col-span-8 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/0 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  Daily Briefing
                  <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-200 border-none px-2 py-0 text-xs">AI Generated</Badge>
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm md:text-base pr-8">
                  Tech markets opened strong following the new AI regulation framework announcements. Your portfolio is up 1.2%. Microsoft's integration of Copilot into enterprise tools is trending on HN. For your day: you have a high-priority tax deadline approaching and 3 meetings scheduled.
                </p>
              </div>
            </div>
          </div>

          {/* Calendar Strip (Horizontal, Middle) */}
          <div className="md:col-span-8 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-400" />
                Schedule
              </h2>
              <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full text-xs">
                View Calendar <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 h-full">
              {EVENTS.map((event, i) => (
                <div key={event.id} className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 hover:bg-white/[0.06] transition-colors relative overflow-hidden">
                  {event.type === 'meeting' && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}
                  {event.type === 'focus' && <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>}
                  
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {event.time}
                    </span>
                    {event.type === 'focus' ? (
                      <Badge className="bg-purple-500/20 text-purple-300 border-none text-[10px]">Focus</Badge>
                    ) : (
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-none text-[10px]">Meeting</Badge>
                    )}
                  </div>
                  <h3 className="font-medium text-white text-sm mb-3">{event.title}</h3>
                  <div className="flex items-center mt-auto">
                    {event.attendees.length > 0 ? (
                      <div className="flex -space-x-2">
                        {event.attendees.map((att, idx) => (
                          <div key={idx} className="h-6 w-6 rounded-full bg-slate-800 border border-[#0a0a14] flex items-center justify-center text-[10px] font-medium text-slate-300">
                            {att}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-6 flex items-center text-xs text-slate-500">
                        Solo
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks List (Dominates Center-Right) */}
          <div className="md:col-span-8 md:row-span-2 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-6 flex flex-col">
             <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                Action Items
              </h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {TASKS.map((task) => (
                <div key={task.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all cursor-pointer">
                  <div className="shrink-0">
                    {task.status === 'in-progress' ? (
                      <PlayCircle className="h-5 w-5 text-indigo-400" />
                    ) : task.status === 'overdue' ? (
                      <Circle className="h-5 w-5 text-red-400/80" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${task.status === 'overdue' ? 'text-red-200' : 'text-slate-200'}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className={`${task.status === 'overdue' ? 'text-red-400' : 'text-slate-500'}`}>
                        {task.time}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                      <span className="text-slate-500">{task.tag}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 border-white/[0.1] text-xs font-normal
                    ${task.status === 'overdue' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                    ${task.status === 'in-progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : ''}
                    ${task.status === 'soon' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                    ${task.status === 'not-started' ? 'text-slate-500' : ''}
                  `}>
                    {task.status.replace('-', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* AI Chat Sidebar (Floats Right) */}
          <div className="md:col-span-4 md:row-span-3 bg-indigo-950/20 backdrop-blur-2xl border border-indigo-500/20 rounded-3xl p-6 flex flex-col h-[700px] shadow-[0_0_40px_-15px_rgba(79,70,229,0.3)]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-500/10">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-[#0a0a14]"></div>
              </div>
              <div>
                <h3 className="font-semibold text-white">Nova OS</h3>
                <p className="text-xs text-indigo-300/70">Always online</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar flex flex-col">
              {CHAT.map((msg, i) => (
                <div key={i} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 shrink-0 border border-indigo-500/20">
                      <AvatarFallback className="bg-indigo-900 text-indigo-300 text-xs">N</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white/[0.03] border border-white/[0.05] text-slate-300 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-500/10">
              <div className="relative">
                <Input 
                  placeholder="Ask Nova anything..." 
                  className="bg-black/40 border-indigo-500/30 text-white placeholder:text-slate-500 rounded-full pl-4 pr-12 h-12 focus-visible:ring-indigo-500/50"
                  readOnly
                />
                <Button size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-center gap-2 mt-3">
                <Badge variant="outline" className="text-[10px] bg-transparent border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 cursor-pointer">Draft email</Badge>
                <Badge variant="outline" className="text-[10px] bg-transparent border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 cursor-pointer">Find docs</Badge>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.4);
        }
      `}} />
    </div>
  );
}

export default BentoGrid;
