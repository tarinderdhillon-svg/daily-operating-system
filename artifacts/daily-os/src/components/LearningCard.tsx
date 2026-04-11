import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen, Sparkles, RefreshCw, RotateCcw, Send, CheckCircle2,
  ChevronDown, ChevronUp, Loader2, Volume2, Pause, Square,
} from "lucide-react";

interface LessonState {
  text: string;
  concept?: string;
  category?: string;
  cached?: boolean;
}

type AudioState = "idle" | "speaking" | "paused";

function stripMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, "$1.")
    .replace(/^### \d+\.\s*(.+)$/gm, "Section: $1.")
    .replace(/^### (.+)$/gm, "Section: $1.")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatLesson(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-lg font-bold text-white mt-1 mb-1 leading-tight">
          {trimmed.replace(/^## /, "")}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-indigo-300 mt-4 mb-1.5 uppercase tracking-wider">
          {trimmed.replace(/^### /, "")}
        </h3>
      );
    } else if (trimmed.startsWith("**Category:**") || trimmed.startsWith("**Difficulty:**")) {
      elements.push(
        <p key={key++} className="text-xs text-slate-400 mb-2 font-mono">
          {trimmed.replace(/\*\*/g, "")}
        </p>
      );
    } else {
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={key++} className="text-sm text-slate-300 leading-relaxed mb-1">
          {parts.map((part, i) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={i} className="text-white font-semibold">{part.replace(/\*\*/g, "")}</strong>
              : part
          )}
        </p>
      );
    }
  }

  return <>{elements}</>;
}

export function LearningCard() {
  const [lesson, setLesson]             = useState<LessonState | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [loadingType, setLoadingType]   = useState<"concept" | "recap" | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [answer, setAnswer]             = useState("");
  const [answerSaved, setAnswerSaved]   = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [expanded, setExpanded]         = useState(true);
  const [audioState, setAudioState]     = useState<AudioState>("idle");
  const utteranceRef                    = useRef<SpeechSynthesisUtterance | null>(null);

  const baseUrl = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function startSpeaking() {
    if (!lesson || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const clean = stripMarkdown(lesson.text);
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.rate  = 0.95;
    utt.pitch = 1;
    utt.lang  = "en-GB";

    utt.onstart  = () => setAudioState("speaking");
    utt.onpause  = () => setAudioState("paused");
    utt.onresume = () => setAudioState("speaking");
    utt.onend    = () => setAudioState("idle");
    utt.onerror  = () => setAudioState("idle");

    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
    setAudioState("speaking");
  }

  function togglePause() {
    if (!window.speechSynthesis) return;
    if (audioState === "speaking") {
      window.speechSynthesis.pause();
      setAudioState("paused");
    } else if (audioState === "paused") {
      window.speechSynthesis.resume();
      setAudioState("speaking");
    }
  }

  function stopSpeaking() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setAudioState("idle");
  }

  async function fetchConcept(type: "concept" | "recap") {
    stopSpeaking();
    setIsLoading(true);
    setLoadingType(type);
    setError(null);
    setAnswerSaved(false);
    setAnswer("");

    try {
      const endpoint = type === "recap" ? "/api/learning/recap" : "/api/learning/concept";
      const res  = await fetch(`${baseUrl}${endpoint}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to load");

      setLesson({
        text: type === "recap" ? data.recap : data.lesson,
        concept: data.concept,
        category: data.category,
        cached: data.cached,
      });
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  }

  async function saveAnswer() {
    if (!answer.trim()) return;
    setIsSavingAnswer(true);
    try {
      const res = await fetch(`${baseUrl}/api/learning/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setAnswerSaved(true);
    } catch {
      setError("Couldn't save your answer — try again");
    } finally {
      setIsSavingAnswer(false);
    }
  }

  return (
    <div className="bento-card rounded-3xl" style={{ overflow: "visible" }}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-4 w-4 text-violet-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">Daily Learning</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wide">AI Powered</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 truncate">
              {lesson?.concept
                ? `${lesson.concept}${lesson.category ? ` · ${lesson.category}` : ""}`
                : "Build consulting-level AI expertise, one concept at a time"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Audio controls — only when a lesson is loaded */}
          {lesson && !isLoading && (
            <div className="flex items-center gap-1 mr-1">
              {audioState === "idle" ? (
                <button
                  onClick={startSpeaking}
                  title="Listen to lesson"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-violet-600/20 hover:bg-violet-500/30 border border-violet-500/20 text-violet-400 transition-all"
                >
                  <Volume2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Listen</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    title={audioState === "speaking" ? "Pause" : "Resume"}
                    className={`p-1.5 rounded-xl transition-all border ${
                      audioState === "speaking"
                        ? "bg-violet-500/20 border-violet-500/30 text-violet-300 hover:bg-violet-500/30"
                        : "bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30"
                    }`}
                  >
                    {audioState === "speaking"
                      ? <Pause className="h-3 w-3" />
                      : <Volume2 className="h-3 w-3 animate-pulse" />
                    }
                  </button>
                  <button
                    onClick={stopSpeaking}
                    title="Stop"
                    className="p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                </>
              )}
              {audioState !== "idle" && (
                <span className={`text-[10px] font-mono ${audioState === "speaking" ? "text-violet-400 animate-pulse" : "text-amber-400"}`}>
                  {audioState === "speaking" ? "Playing…" : "Paused"}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => fetchConcept("concept")}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-indigo-600/80 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 shadow-sm shadow-indigo-500/20"
          >
            {isLoading && loadingType === "concept"
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3" />
            }
            Today's Concept
          </button>

          <button
            onClick={() => fetchConcept("recap")}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white/[0.05] hover:bg-violet-500/15 border border-white/[0.06] hover:border-violet-500/25 text-slate-300 hover:text-violet-300 transition-all disabled:opacity-50"
          >
            {isLoading && loadingType === "recap"
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <RotateCcw className="h-3 w-3" />
            }
            Weekly Recap
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!lesson && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center mb-1">
            <BookOpen className="h-6 w-6 text-violet-400/60" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Click <span className="text-indigo-400 font-medium">Today's Concept</span> to generate your daily AI lesson, or <span className="text-violet-400 font-medium">Weekly Recap</span> for a quiz on this week's concepts.
          </p>
          <p className="text-[11px] text-slate-700 font-mono">Lessons auto-generate at 5:30 AM · Saved to Notion</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-500">
            {loadingType === "recap" ? "Generating your weekly recap…" : "Selecting and generating today's concept…"}
          </p>
          <p className="text-[11px] text-slate-700 font-mono">Using GPT-4o · ~10-15 seconds</p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="mx-5 mt-4 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <span className="text-red-400/70">⚠</span>
          {error}
        </div>
      )}

      {/* Lesson content */}
      {lesson && !isLoading && (
        <>
          {/* Collapse toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-5 py-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors border-b border-white/[0.03]"
          >
            <span className="font-mono uppercase tracking-wider">
              {expanded ? "Collapse lesson" : "Show full lesson"}
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="px-5 py-4">
              <div>{formatLesson(lesson.text)}</div>

              <div className="my-5 border-t border-white/[0.04]" />

              {/* Reflection answer */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                  Your Reflection Answer
                </label>

                {answerSaved ? (
                  <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Answer saved to Notion — status updated to Reviewed
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <textarea
                      rows={2}
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Answer the reflection question above in 1-2 sentences…"
                      className="flex-1 resize-none rounded-xl bg-black/30 border border-white/[0.08] focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none transition-all"
                    />
                    <button
                      onClick={saveAnswer}
                      disabled={!answer.trim() || isSavingAnswer}
                      title="Save answer to Notion"
                      className="flex-shrink-0 mb-0.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.05] disabled:opacity-40 text-white"
                    >
                      {isSavingAnswer
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                )}
              </div>

              {lesson.cached && (
                <p className="text-[10px] text-slate-700 font-mono mt-4 flex items-center gap-1.5">
                  Loaded from today's Notion entry ·
                  <button
                    onClick={() => fetchConcept("concept")}
                    className="text-indigo-600 hover:text-indigo-400 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Regenerate
                  </button>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
