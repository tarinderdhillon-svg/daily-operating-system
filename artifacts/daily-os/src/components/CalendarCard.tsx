import { useGetCalendar } from "@workspace/api-client-react";
import { Calendar as CalendarIcon } from "lucide-react";
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
    return <div className="glass-card rounded-2xl p-6 h-[300px] animate-pulse mb-6" />;
  }

  const renderDay = (day: { date: string; events: Array<{ time: string; title: string; duration?: string | null }> } | undefined, isToday: boolean) => (
    <div className={`flex-1 ${isToday ? "border-r border-white/10 pr-6" : "pl-6"}`}>
      <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-400 mb-4 flex items-center justify-between">
        <span>{isToday ? "Today" : "Tomorrow"}</span>
        {day?.date && (
          <span className="text-xs text-slate-500">
            {safeFormatDate(day.date, "MMM d")}
          </span>
        )}
      </h3>

      {!day || !day.events || day.events.length === 0 ? (
        <div className="text-sm text-slate-500 italic py-4 flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-xl bg-white/5">
          <CalendarIcon size={20} className="opacity-50" />
          No events scheduled
        </div>
      ) : (
        <div className="space-y-3">
          {day.events.map((event, i) => (
            <div
              key={i}
              className="group flex gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-transparent hover:border-white/5 transition-all"
            >
              <div className="flex flex-col items-end min-w-[60px] text-xs font-mono text-slate-400 mt-0.5">
                <span className="text-slate-300">{event.time}</span>
                {event.duration && (
                  <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {event.duration}
                  </span>
                )}
              </div>
              <div className="w-[2px] bg-blue-500/30 rounded-full relative">
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-200 font-medium leading-tight">{event.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="glass-card rounded-2xl p-6 mb-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-100">
        <CalendarIcon className="text-indigo-400" /> Schedule
      </h2>
      <div className="flex">
        {renderDay(calendarResponse?.today, true)}
        {renderDay(calendarResponse?.tomorrow, false)}
      </div>
    </div>
  );
}
