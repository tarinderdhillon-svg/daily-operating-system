import { useGetCalendar } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { parseISO, format, isValid } from "date-fns";

function safeFormatDate(dateStr: string, fmt: string, fallback = ""): string {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}

export function CalendarCard() {
  const { data: calendarResponse, isLoading } = useGetCalendar();

  if (isLoading) {
    return <div className="bento-card rounded-3xl p-6 h-[180px] animate-pulse" />;
  }

  const renderDay = (
    day: { date: string; events: Array<{ time: string; title: string; duration?: string | null }> } | undefined,
    isToday: boolean,
  ) => (
    <div className={`flex-1 ${isToday ? "border-r border-white/[0.06] pr-5" : "pl-5"}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xs font-bold tracking-widest uppercase ${isToday ? "text-indigo-400" : "text-slate-500"}`}>
          {isToday ? "Today" : "Tomorrow"}
        </h3>
        {day?.date && (
          <span className="text-[10px] text-slate-600 font-mono">
            {safeFormatDate(day.date, "MMM d")}
          </span>
        )}
      </div>

      {!day || !day.events || day.events.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-600 py-3 px-3 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <CalendarIcon className="h-3.5 w-3.5 opacity-50" />
          No events scheduled
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-2.5">
          {day.events.map((event, i) => (
            <div
              key={i}
              className="flex-1 group flex gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-indigo-500/20 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-0.5 h-full bg-indigo-500/50 rounded-full" />
              <div className="pl-1 flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mb-0.5">
                  <Clock className="h-3 w-3 text-indigo-400/60" />
                  {event.time}
                  {event.duration && (
                    <span className="text-slate-600"> · {event.duration}</span>
                  )}
                </div>
                <p className="text-sm text-slate-200 font-medium leading-snug truncate">{event.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bento-card rounded-3xl p-5 hover:border-indigo-500/20 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-indigo-400" />
          Schedule
        </h2>
      </div>
      <div className="flex">
        {renderDay(calendarResponse?.today, true)}
        {renderDay(calendarResponse?.tomorrow, false)}
      </div>
    </div>
  );
}
