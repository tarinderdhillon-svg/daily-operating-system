import React, { useState, useRef, useEffect, useCallback } from "react";
import { useProcessChat, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Bot, User, CheckCircle2, Mic, MicOff, AlertCircle, Square } from "lucide-react";

interface Message {
  role: "user" | "bot" | "system";
  content: string;
  id: string;
}

interface PendingTask {
  title: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
  missing_fields: string[];
}

export function ChatPanel() {
  const processChat = useProcessChat();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    role: "bot",
    id: "init",
    content: "Good morning, Tarinder. I'm connected to your Notion workspace.\n\nTry saying:\n• \"Create a task: [name], due [date], priority [level]\"\n• \"Show my overdue tasks\"\n• \"What's on today?\"\n\nTap the mic to use voice. What do you need?",
  }]);
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<BlobPart[]>([]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, []);

  useEffect(() => { autoResize(); }, [input, autoResize]);

  const addMessage = (msg: Omit<Message, "id">) =>
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}_${Math.random()}` }]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || processChat.isPending) return;
    setInput("");
    addMessage({ role: "user", content: trimmed });

    const payload = pendingTask
      ? `__PENDING_TASK__|${JSON.stringify(pendingTask)}|user_reply:${trimmed}`
      : trimmed;

    processChat.mutate({ data: { message: payload } }, {
      onSuccess: (data) => {
        addMessage({ role: "bot", content: data.response });
        if (data.action_taken === "task_pending" && data.data) {
          setPendingTask(data.data as PendingTask);
        } else {
          setPendingTask(null);
        }
        if (data.action_taken === "task_created") {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          addMessage({ role: "system", content: "Task synced to Notion." });
        }
      },
      onError: () => {
        setPendingTask(null);
        addMessage({ role: "system", content: "Connection error. Please try again." });
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Voice: MediaRecorder + Whisper ─────────────────────────────────────────
  const startRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(blob, mimeType);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setVoiceError("Microphone access denied. Please allow it in your browser settings.");
      } else {
        setVoiceError("Could not access microphone.");
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    try {
      const formData = new FormData();
      const ext = mimeType.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", blob, `recording.${ext}`);

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json() as { success: boolean; text?: string; error?: string };

      if (data.success && data.text) {
        setInput(prev => (prev ? prev + " " + data.text : data.text!));
        setTimeout(() => textareaRef.current?.focus(), 50);
      } else {
        setVoiceError("Could not transcribe audio. Please try again or type your message.");
      }
    } catch {
      setVoiceError("Transcription failed. Please type your message instead.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const voiceBusy = isRecording || isTranscribing;

  return (
    <div className="glass-card rounded-2xl flex flex-col h-[calc(100vh-48px)] sticky top-6">

      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-slate-900/50 backdrop-blur-md rounded-t-2xl">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.4)]">
            <Bot size={18} className="text-white" />
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0f172a] rounded-full" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-100 text-sm">Daily OS Assistant</h2>
          <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> ONLINE · Notion Connected
          </div>
        </div>
      </div>

      {/* Pending task banner */}
      {pendingTask && (
        <div className="mx-3 mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2 text-xs text-amber-300 flex-shrink-0">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Creating: </span>
            <span className="font-mono">"{pendingTask.title ?? "…"}"</span>
            <span className="text-amber-400/60 ml-1">— still need: {pendingTask.missing_fields?.join(", ")}</span>
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}>
            {msg.role === "system" ? (
              <div className="mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 font-mono">
                <CheckCircle2 size={11} /> {msg.content}
              </div>
            ) : (
              <div className={`flex max-w-[90%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "user" ? "bg-blue-600" : "bg-slate-800 border border-white/10"}`}>
                  {msg.role === "user" ? <User size={12} className="text-white" /> : <Bot size={12} className="text-blue-400" />}
                </div>
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-800/80 border border-white/5 text-slate-200 rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {(processChat.isPending || isTranscribing) && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                <Bot size={12} className="text-blue-400" />
              </div>
              <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-white/5 flex items-center gap-1.5">
                {isTranscribing
                  ? <span className="text-xs text-slate-400 font-mono animate-pulse">Transcribing…</span>
                  : <>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.3s]" />
                  </>
                }
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice error */}
      {voiceError && (
        <div className="mx-3 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2 flex-shrink-0">
          <AlertCircle size={11} />
          <span className="flex-1">{voiceError}</span>
          <button onClick={() => setVoiceError(null)} className="text-red-400/50 hover:text-red-400 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-white/10 bg-slate-900/50 backdrop-blur-md rounded-b-2xl flex-shrink-0">
        <div className="flex items-end gap-2">
          {/* Voice button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={processChat.isPending || isTranscribing}
            title={isRecording ? "Stop & transcribe" : "Hold to record voice"}
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 mb-0.5 ${
              isRecording
                ? "bg-red-500 hover:bg-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse"
                : isTranscribing
                  ? "bg-amber-500/30 text-amber-400"
                  : "bg-white/8 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-slate-200"
            }`}
          >
            {isRecording ? <Square size={13} className="text-white" /> : <Mic size={15} />}
          </button>

          {/* Textarea */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Recording… click ■ to stop" : isTranscribing ? "Transcribing…" : pendingTask ? "Reply with missing details…" : "Message… (Enter to send, Shift+Enter for new line)"}
              disabled={processChat.isPending || voiceBusy}
              className={`w-full resize-none bg-black/40 border rounded-xl py-2.5 pl-3.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-60 leading-5 max-h-[140px] overflow-y-auto ${
                isRecording
                  ? "border-red-500/50"
                  : pendingTask
                    ? "border-amber-500/40 focus:ring-amber-500/30"
                    : "border-white/10 focus:ring-blue-500/30 focus:border-blue-500/40"
              }`}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || processChat.isPending || voiceBusy}
              className="absolute right-1.5 bottom-1.5 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] text-red-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            Recording — tap ■ when done
          </div>
        )}
        <p className="text-center text-[10px] text-slate-600 mt-1.5 font-mono">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
