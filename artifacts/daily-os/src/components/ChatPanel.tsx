import React, { useState, useRef, useEffect } from "react";
import { useProcessChat, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Bot, User, CheckCircle2 } from "lucide-react";

interface Message {
  role: 'user' | 'bot' | 'system';
  content: string;
  id: string;
}

export function ChatPanel() {
  const processChat = useProcessChat();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Good morning, Tarinder. I'm connected to your schedule, tasks, and Notion workspace. What do you need today?", id: 'init' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processChat.isPending) return;

    const userMessage = input.trim();
    setInput("");
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: Date.now().toString() }]);

    processChat.mutate({ data: { message: userMessage } }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { role: 'bot', content: data.response, id: Date.now().toString() + '_bot' }]);
        
        if (data.action_taken?.includes("task")) {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `Task updated successfully.`, 
            id: Date.now().toString() + '_sys' 
          }]);
        }
      },
      onError: () => {
        setMessages(prev => [...prev, { role: 'system', content: "Connection error. Please try again.", id: Date.now().toString() + '_err' }]);
      }
    });
  };

  return (
    <div className="glass-card rounded-2xl flex flex-col h-[calc(100vh-48px)] sticky top-6">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50 backdrop-blur-md rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Bot size={20} className="text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0f172a] rounded-full"></div>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100">Daily OS Assistant</h2>
            <div className="text-xs text-emerald-400 font-mono tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {msg.role === 'system' ? (
              <div className="mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-xs flex items-center gap-2 font-mono">
                <CheckCircle2 size={14} />
                {msg.content}
              </div>
            ) : (
              <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-slate-800 border border-white/10'}`}>
                  {msg.role === 'user' ? <User size={16} className="text-slate-300" /> : <Bot size={16} className="text-blue-400" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {processChat.isPending && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-blue-400" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-white/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-slate-900/50 backdrop-blur-md rounded-b-2xl">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you need?"
            disabled={processChat.isPending}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || processChat.isPending}
            className="absolute right-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
          >
            <Send size={16} className={input.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}
