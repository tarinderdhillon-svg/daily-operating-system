import React, { useState, useRef, useEffect } from "react";
import { useProcessChat, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Bot, User, CheckCircle2, Mic, MicOff, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "bot" | "system";
  content: string;
  id: string;
  isPending?: boolean;
}

interface PendingTask {
  title: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  missing_fields: string[];
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function ChatPanel() {
  const processChat = useProcessChat();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Good morning, Tarinder. I'm connected to your schedule, tasks, and Notion workspace.\n\nYou can say things like:\n• \"Create a task called [name] due [date] priority [level]\"\n• \"Show my overdue tasks\"\n• \"What's on today?\"\n\nOr tap the mic to speak. What do you need?",
      id: "init",
    },
  ]);
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg: Omit<Message, "id">) => {
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}_${Math.random()}` }]);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    setVoiceError(null);
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-GB";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setVoiceError("Microphone access denied. Please allow microphone in browser settings.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setVoiceError(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const sendMessage = (rawInput: string) => {
    const text = rawInput.trim();
    if (!text || processChat.isPending) return;

    setInput("");
    addMessage({ role: "user", content: text });

    let messageToSend = text;

    if (pendingTask) {
      messageToSend = `__PENDING_TASK__|${JSON.stringify(pendingTask)}|user_reply:${text}`;
    }

    processChat.mutate(
      { data: { message: messageToSend } },
      {
        onSuccess: (data) => {
          addMessage({ role: "bot", content: data.response });

          if (data.action_taken === "task_pending" && data.data) {
            setPendingTask(data.data as PendingTask);
          } else {
            setPendingTask(null);
          }

          if (data.action_taken === "task_created") {
            queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
            addMessage({ role: "system", content: "Task synced to Notion and task list." });
          }
        },
        onError: () => {
          setPendingTask(null);
          addMessage({ role: "system", content: "Connection error. Please try again." });
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="glass-card rounded-2xl flex flex-col h-[calc(100vh-48px)] sticky top-6">

      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/50 backdrop-blur-md rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Bot size={20} className="text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0f172a] rounded-full" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100">Daily OS Assistant</h2>
            <div className="text-xs text-emerald-400 font-mono tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </div>
          </div>
        </div>
        {voiceSupported && (
          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <Mic size={10} />
            VOICE READY
          </div>
        )}
      </div>

      {/* Pending task banner */}
      {pendingTask && (
        <div className="mx-4 mt-3 px-3 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2 text-xs text-amber-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Completing task: </span>
            <span className="font-mono">"{pendingTask.title ?? "…"}"</span>
            <span className="text-amber-400/70 ml-1">— waiting for: {pendingTask.missing_fields?.join(", ")}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            {msg.role === "system" ? (
              <div className="mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-xs flex items-center gap-2 font-mono">
                <CheckCircle2 size={13} />
                {msg.content}
              </div>
            ) : (
              <div className={`flex max-w-[88%] gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-blue-600" : "bg-slate-800 border border-white/10"}`}>
                  {msg.role === "user"
                    ? <User size={14} className="text-white" />
                    : <Bot size={14} className="text-blue-400" />
                  }
                </div>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                      : "bg-slate-800/80 border border-white/5 text-slate-200 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {processChat.isPending && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-blue-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-white/5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice error */}
      {voiceError && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={12} />
          {voiceError}
          <button onClick={() => setVoiceError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-white/10 bg-slate-900/50 backdrop-blur-md rounded-b-2xl">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Voice button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={processChat.isPending}
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
                isListening
                  ? "bg-red-500 hover:bg-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  : "bg-white/8 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-slate-200"
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening
                ? <MicOff size={16} className="text-white" />
                : <Mic size={16} />
              }
            </button>
          )}

          {/* Text input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening…" : pendingTask ? "Reply with the missing details…" : "Ask me anything or create a task…"}
              disabled={processChat.isPending || isListening}
              className={`w-full bg-black/40 border rounded-xl py-2.5 pl-3.5 pr-11 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-60 ${
                isListening
                  ? "border-red-500/50 focus:ring-red-500/30"
                  : pendingTask
                    ? "border-amber-500/40 focus:ring-amber-500/30 focus:border-amber-500/60"
                    : "border-white/10 focus:ring-blue-500/30 focus:border-blue-500/40"
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || processChat.isPending}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
            >
              <Send size={14} className={input.trim() ? "translate-x-px -translate-y-px" : ""} />
            </button>
          </div>
        </form>

        {isListening && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-red-400 font-mono animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            Listening — speak now…
          </div>
        )}
      </div>
    </div>
  );
}
