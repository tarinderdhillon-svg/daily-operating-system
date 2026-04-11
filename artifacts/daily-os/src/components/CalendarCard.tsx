import { useGetCalendar } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { parseISO, format, isValid } from "date-fns";
import { useRef, useState, useEffect } from "react";

function safeFormatDate(dateStr: string, fmt: string, fallback = ""): string {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}

type CalEvent = { time: string; title: string; duration?: string | null };

function EventStrip({ events, label, date, accent }: {
  events: CalEvent[];
  label: string;
  date?: string;
  accent: "indigo" | "violet";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const accentCls = accent === "indigo"
    ? { label: "text-indigo-400", dot: "bg-indigo-500/50", shadow: "rgba(99,102,241,0.3)" }
    : { label: "text-violet-400",  dot: "bg-violet-500/50",  shadow: "rgba(139,92,246,0.3)"  };

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [events]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Day header */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold tracking-widest uppercase ${accentCls.label}`}>
            {label}
          </span>
          {events.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${accentCls.shadow}30`, color: accent === "indigo" ? "#818cf8" : "#a78bfa" }}>
              {events.length}
            </span>
          )}
        </div>
        {date && (
          <span className="text-[10px] text-slate-600 font-mono">{safeFormatDate(date, "EEE, MMM d")}</span>
        )}
      </div>

      {!events || events.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 py-3 px-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] h-[74px]">
          <CalendarIcon className="h-3.5 w-3.5 opacity-40" />
          No events
        </div>
      ) : (
        <div className="relative group/strip">
          {/* Left fade + arrow */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0a0a14] to-transparent z-10 flex items-center">
              <button onClick={() => scroll("left")}
                className="ml-0.5 w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all">
                <ChevronLeft size={12} />
              </button>
            </div>
          )}

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-2.5 overflow-x-auto pb-1 scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {events.map((event, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[168px] flex flex-col gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all relative overflow-hidden cursor-default"
                style={{ minHeight: "74px" }}
              >
                {/* Accent left bar */}
                <div className={`absolute top-2 bottom-2 left-0 w-0.5 ${accentCls.dot} rounded-full`} />
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono pl-1.5">
                  <Clock className="h-3 w-3 flex-shrink-0" style={{ color: accent === "indigo" ? "#6366f1aa" : "#8b5cf6aa" }} />
                  {event.time}
                  {event.duration && <span className="text-slate-600 ml-0.5">· {event.duration}</span>}
                </div>
                <p className="text-sm text-slate-200 font-medium leading-snug pl-1.5 line-clamp-2">{event.title}</p>
              </div>
            ))}
            {/* Right sentinel for scroll detection */}
            <div className="flex-shrink-0 w-1" />
          </div>

          {/* Right fade + arrow */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0a0a14] to-transparent z-10 flex items-center justify-end">
              <button onClick={() => scroll("right")}
                className="mr-0.5 w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all">
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CalendarCard() {
  const { data: calendarResponse, isLoading } = useGetCalendar();

  if (isLoading) {
    return <div className="bento-card rounded-3xl p-5 h-[160px] animate-pulse" />;
  }

  return (
    <div className="bento-card rounded-3xl p-5 hover:border-indigo-500/20 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-white">Schedule</h2>
        {calendarResponse?.today?.date && (
          <span className="ml-auto text-[10px] text-slate-600 font-mono">
            {safeFormatDate(calendarResponse.today.date, "MMMM yyyy")}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <EventStrip
          events={calendarResponse?.today?.events ?? []}
          label="Today"
          date={calendarResponse?.today?.date}
          accent="indigo"
        />
        <div className="hidden sm:block w-px bg-white/[0.05] self-stretch" />
        <EventStrip
          events={calendarResponse?.tomorrow?.events ?? []}
          label="Tomorrow"
          date={calendarResponse?.tomorrow?.date}
          accent="violet"
        />
      </div>
    </div>
  );
}
