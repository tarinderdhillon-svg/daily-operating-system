import React, { useState, useRef, useEffect, useCallback } from "react";
import { useProcessChat, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Send, Bot, User, CheckCircle2, Mic, AlertCircle, Square, Zap,
  ChevronRight, Calendar, Tag, FileText, FolderOpen, ListChecks,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface Message {
  role: "user" | "bot" | "system";
  content: string;
  id: string;
  isForm?: boolean; // bot message that carries the inline task form
}

interface PendingTask {
  title: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
  missing_fields: string[];
}

type Project = { id: string; name: string };

/* ─── Field config ───────────────────────────────────────── */

const FIELD_META: Record<string, {
  label: string;
  icon: React.ReactNode;
  type: "text" | "date" | "textarea" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}> = {
  notes: {
    label: "Notes",
    icon: <FileText size={11} />,
    type: "textarea",
    placeholder: "Any extra context… (or leave blank)",
  },
  due_date: {
    label: "Due Date",
    icon: <Calendar size={11} />,
    type: "date",
  },
  priority: {
    label: "Priority",
    icon: <Tag size={11} />,
    type: "select",
    options: [
      { value: "", label: "— pick one —" },
      { value: "Urgent", label: "🔴 Urgent" },
      { value: "High", label: "🟠 High" },
      { value: "Medium", label: "🟡 Medium" },
      { value: "Low", label: "🟢 Low" },
    ],
  },
  status: {
    label: "Status",
    icon: <ListChecks size={11} />,
    type: "select",
    options: [
      { value: "", label: "— pick one —" },
      { value: "Not started", label: "Not started" },
      { value: "In progress", label: "In progress" },
      { value: "In Review", label: "In Review" },
      { value: "Done", label: "Done" },
    ],
  },
  title: {
    label: "Task name",
    icon: <FileText size={11} />,
    type: "text",
    placeholder: "What needs to be done?",
  },
  related_project: {
    label: "Related project",
    icon: <FolderOpen size={11} />,
    type: "select",
    options: [], // populated dynamically
  },
};

/* ─── Inline pending-task form ───────────────────────────── */

function InlinePendingForm({
  pendingTask,
  projects,
  onSubmit,
  disabled,
}: {
  pendingTask: PendingTask;
  projects: Project[];
  onSubmit: (values: Record<string, string>) => void;
  disabled: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of pendingTask.missing_fields) init[f] = "";
    return init;
  });

  const set = (field: string, val: string) =>
    setValues(prev => ({ ...prev, [field]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 mt-2">
      {pendingTask.missing_fields.map(field => {
        const meta = FIELD_META[field];
        if (!meta) return null;

        const fieldClass = `w-full bg-black/30 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-slate-200
          placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1
          focus:ring-indigo-500/20 transition-all`;

        let options = meta.options ?? [];
        if (field === "related_project") {
          options = [
            { value: "", label: "— no project —" },
            ...projects.map(p => ({ value: p.name, label: p.name })),
          ];
        }

        return (
          <div key={field}>
            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span className="text-indigo-400">{meta.icon}</span>
              {meta.label}
            </label>

            {meta.type === "textarea" ? (
              <textarea
                rows={2}
                value={values[field]}
                onChange={e => set(field, e.target.value)}
                placeholder={meta.placeholder}
                disabled={disabled}
                className={`${fieldClass} resize-none`}
              />
            ) : meta.type === "select" ? (
              <select
                value={values[field]}
                onChange={e => set(field, e.target.value)}
                disabled={disabled}
                className={fieldClass}
              >
                {options.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : meta.type === "date" ? (
              <input
                type="date"
                value={values[field]}
                onChange={e => set(field, e.target.value)}
                disabled={disabled}
                className={fieldClass}
              />
            ) : (
              <input
                type="text"
                value={values[field]}
                onChange={e => set(field, e.target.value)}
                placeholder={meta.placeholder}
                disabled={disabled}
                className={fieldClass}
              />
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={disabled}
        className="flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-500 disabled:opacity-40 text-white
          text-xs font-semibold px-3 py-1.5 rounded-xl transition-all w-full justify-center mt-1"
      >
        <CheckCircle2 size={11} />
        Confirm &amp; Create Task
        <ChevronRight size={11} />
      </button>

      <p className="text-[10px] text-slate-600 text-center font-mono">
        or type your reply below · voice also works
      </p>
    </form>
  );
}

/* ─── Main ChatPanel ─────────────────────────────────────── */

export function ChatPanel() {
  const processChat = useProcessChat();
  const queryClient = useQueryClient();

  const baseUrl = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    role: "bot",
    id: "init",
    content: "Good morning, Tarinder. I'm connected to your Notion workspace.\n\nTry saying:\n• \"Create a task: [name], due [date], priority [level]\"\n• \"Show my overdue tasks\"\n• \"What's on today?\"\n\nTap the mic to use voice. What do you need?",
  }]);
  const [pendingTask, setPendingTask]   = useState<PendingTask | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [projects, setProjects]         = useState<Project[]>([]);
  const [isRecording, setIsRecording]   = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError]     = useState<string | null>(null);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<BlobPart[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingTask]);

  // Fetch projects whenever pending task includes related_project field
  useEffect(() => {
    if (pendingTask?.missing_fields?.includes("related_project")) {
      fetch(`${baseUrl}/api/tasks/projects`)
        .then(r => r.json())
        .then(d => setProjects(d.projects ?? []))
        .catch(() => {});
    }
  }, [pendingTask, baseUrl]);

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
        const isNowPending = data.action_taken === "task_pending" && data.data;

        addMessage({
          role: "bot",
          content: data.response,
          isForm: !!isNowPending,
        });

        setFormSubmitted(false);

        if (isNowPending) {
          setPendingTask(data.data as PendingTask);
        } else {
          setPendingTask(null);
        }

        if (data.action_taken === "task_created") {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          addMessage({ role: "system", content: "Task synced to Notion." });
        } else if (data.action_taken === "task_updated") {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          addMessage({ role: "system", content: "Notion updated." });
        } else if (data.action_taken === "task_deleted") {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          addMessage({ role: "system", content: "Task removed from Notion." });
        }
      },
      onError: () => {
        setPendingTask(null);
        addMessage({ role: "system", content: "Connection error. Please try again." });
      },
    });
  };

  // Called when user submits the inline form
  const handleFormSubmit = (values: Record<string, string>) => {
    const parts: string[] = [];
    for (const [field, val] of Object.entries(values)) {
      const meta = FIELD_META[field];
      const label = meta?.label ?? field;
      parts.push(`${label}: ${val || "none"}`);
    }
    setFormSubmitted(true);
    sendMessage(parts.join(". "));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ── Recording ─────────────────────────────────────────── */

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
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
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

      const res  = await fetch(`${baseUrl}/api/transcribe`, { method: "POST", body: formData });
      const data = await res.json() as { success: boolean; text?: string; error?: string };

      if (data.success && data.text?.trim()) {
        sendMessage(data.text.trim());
      } else if (data.success && !data.text?.trim()) {
        setVoiceError("No speech detected. Please try again.");
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

  // The last form message is the one that should show the live form
  const lastFormMsgId = [...messages].reverse().find(m => m.isForm)?.id;

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div
      className="rounded-3xl flex flex-col lg:sticky lg:top-6 overflow-hidden h-[480px] lg:h-[calc(100vh-80px)]"
      style={{
        background: "rgba(30, 27, 75, 0.25)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(99, 102, 241, 0.18)",
        boxShadow: "0 0 48px -16px rgba(79, 70, 229, 0.25)",
        minHeight: "400px",
      }}
    >
      {/* Header */}
      <div className="p-4 pb-3.5 border-b border-indigo-500/10 flex items-center gap-3 flex-shrink-0">
        <div className="relative">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap size={16} className="text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0a0a14] rounded-full" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white text-sm">Nova OS</h2>
          <div className="text-[10px] text-indigo-300/70 font-mono flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Always online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bento-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
          >
            {msg.role === "system" ? (
              <div className="mx-auto bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 font-mono">
                <CheckCircle2 size={10} /> {msg.content}
              </div>
            ) : (
              <div className={`flex max-w-[95%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  msg.role === "user"
                    ? "bg-indigo-600 border border-indigo-500/50"
                    : "bg-indigo-950 border border-indigo-500/20"
                }`}>
                  {msg.role === "user"
                    ? <User size={11} className="text-white" />
                    : <Bot size={11} className="text-indigo-400" />}
                </div>

                {/* Bubble */}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm whitespace-pre-wrap"
                    : "bg-white/[0.03] border border-white/[0.05] text-slate-300 rounded-tl-sm"
                }`}>
                  <span className="whitespace-pre-wrap">{msg.content}</span>

                  {/* Inline form — only on the latest form message */}
                  {msg.isForm && msg.id === lastFormMsgId && pendingTask && (
                    <InlinePendingForm
                      pendingTask={pendingTask}
                      projects={projects}
                      onSubmit={handleFormSubmit}
                      disabled={formSubmitted || processChat.isPending}
                    />
                  )}

                  {/* Already submitted state for older form messages */}
                  {msg.isForm && msg.id !== lastFormMsgId && (
                    <div className="mt-2 text-[10px] text-slate-600 font-mono flex items-center gap-1">
                      <CheckCircle2 size={9} className="text-emerald-600" /> Submitted
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {(processChat.isPending || isTranscribing) && (
          <div className="flex justify-start animate-in fade-in">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                <Bot size={11} className="text-indigo-400" />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white/[0.03] border border-white/[0.05] flex items-center gap-1.5">
                {isTranscribing
                  ? <span className="text-xs text-slate-500 font-mono animate-pulse">Transcribing…</span>
                  : <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.3s]" />
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
        <div className="mx-3 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/15 rounded-xl text-xs text-red-400 flex items-center gap-2 flex-shrink-0">
          <AlertCircle size={10} />
          <span className="flex-1">{voiceError}</span>
          <button onClick={() => setVoiceError(null)} className="text-red-400/50 hover:text-red-400 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Input area */}
      <div className="px-3 pb-3 pt-2 border-t border-indigo-500/10 flex-shrink-0">
        <div className={`flex items-center gap-0 rounded-2xl transition-all ${
          isRecording
            ? "ring-1 ring-red-500/40 bg-black/50"
            : pendingTask
              ? "ring-1 ring-indigo-500/25 bg-black/30 focus-within:ring-indigo-500/40"
              : "ring-1 ring-indigo-500/20 bg-black/30 focus-within:ring-indigo-500/40"
        }`}>

          {/* Mic */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={processChat.isPending || isTranscribing}
            title={isRecording ? "Stop recording" : "Record voice"}
            className={`flex-shrink-0 w-10 h-10 rounded-l-2xl flex items-center justify-center transition-all disabled:opacity-40 ${
              isRecording
                ? "text-red-400"
                : isTranscribing
                  ? "text-amber-400"
                  : "text-slate-500 hover:text-indigo-400"
            }`}
          >
            {isRecording
              ? <Square size={13} className="animate-pulse" />
              : isTranscribing
                ? <Mic size={15} className="animate-pulse text-amber-400" />
                : <Mic size={15} />
            }
          </button>

          <div className="w-px h-5 bg-white/[0.06] flex-shrink-0" />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording      ? "Recording… tap ■ to stop"
              : isTranscribing ? "Transcribing voice…"
              : pendingTask    ? "Or type your reply here…"
              : "Ask Nova anything…"
            }
            disabled={processChat.isPending || voiceBusy}
            className="flex-1 resize-none bg-transparent py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none leading-5 max-h-[120px] overflow-y-auto disabled:opacity-60 bento-scrollbar"
          />

          {/* Send */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || processChat.isPending || voiceBusy}
            title="Send message"
            className="flex-shrink-0 w-10 h-10 rounded-r-2xl flex items-center justify-center transition-all text-slate-600 hover:text-indigo-400 disabled:text-slate-700 disabled:hover:text-slate-700"
          >
            <Send size={14} className={input.trim() && !processChat.isPending && !voiceBusy ? "text-indigo-400" : ""} />
          </button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1 text-[10px] text-red-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping flex-shrink-0" />
            Recording — tap the stop icon when done
          </div>
        )}
      </div>
    </div>
  );
}
