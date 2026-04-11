import React, { useState } from "react";
import { parseISO, format, isValid } from "date-fns";
import {
  useGetTasks, useCreateTask, useUpdateTask, useDeleteTask, getGetTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit2, Trash2, CheckCircle2, Circle,
  AlertTriangle, Clock, Zap, ListTodo, ChevronDown, ChevronRight, X, Check,
} from "lucide-react";

type Task = {
  id: string; title: string;
  due_date?: string | null; priority?: "Urgent" | "High" | "Medium" | "Low" | null;
  status?: string | null; notes?: string | null;
};

const PRIORITY_CFG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  Urgent: { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "#f87171", dot: "#f87171" },
  High:   { color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "#fb923c", dot: "#fb923c" },
  Medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "#fbbf24", dot: "#fbbf24" },
  Low:    { color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "#4ade80", dot: "#4ade80" },
};
const DEFAULT_CFG = { color: "#64748b", bg: "transparent", border: "#334155", dot: "#64748b" };

const SECTION_CFG = {
  overdue:    { label: "Overdue",      icon: <AlertTriangle size={13} />, color: "text-red-400",   accent: "#f87171", bg: "bg-red-500/5"   },
  outstanding:{ label: "Due Soon",     icon: <Clock size={13} />,         color: "text-amber-400", accent: "#fbbf24", bg: "bg-amber-500/5" },
  inProgress: { label: "In Progress",  icon: <Zap size={13} />,           color: "text-blue-400",  accent: "#60a5fa", bg: "bg-blue-500/5"  },
  todo:       { label: "Not Started",  icon: <Circle size={13} />,        color: "text-slate-400", accent: "#94a3b8", bg: "bg-slate-500/5" },
};

function safeDue(d: string | null | undefined) {
  if (!d) return null;
  try { const dt = parseISO(d); return isValid(dt) ? format(dt, "MMM d") : d; } catch { return d; }
}

function TaskRow({ task, onDone, onDelete, onEdit }: {
  task: Task;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
}) {
  const p = PRIORITY_CFG[task.priority ?? ""] ?? DEFAULT_CFG;
  const due = safeDue(task.due_date);

  return (
    <div
      className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all cursor-default"
      style={{ borderLeft: `2px solid ${p.border}33`, paddingLeft: "10px" }}
    >
      {/* Done button */}
      <button
        onClick={() => onDone(task.id)}
        title="Mark as done"
        className="flex-shrink-0 mt-0.5 w-4.5 h-4.5 rounded-full border border-slate-600 hover:border-emerald-400 hover:bg-emerald-400/10 flex items-center justify-center transition-all group/done"
        style={{ width: "18px", height: "18px" }}
      >
        <Check size={10} className="text-slate-600 group-hover/done:text-emerald-400 transition-colors" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 font-medium leading-snug truncate">{task.title}</p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
          {due && (
            <span className="text-[11px] text-slate-500 font-mono">{due}</span>
          )}
          {task.status && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.dot + "99" }} />
              {task.status}
            </span>
          )}
          {task.priority && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: p.color, background: p.bg }}>
              {task.priority}
            </span>
          )}
        </div>
        {task.notes && (
          <p className="text-[11px] text-slate-500 mt-1 truncate italic">"{task.notes}"</p>
        )}
      </div>

      {/* Actions (hover) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 flex-shrink-0 -mt-0.5">
        <button onClick={() => onEdit(task)} title="Edit"
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-colors">
          <Edit2 size={11} />
        </button>
        <button onClick={() => onDelete(task.id)} title="Delete"
          className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function Section({
  sectionKey, tasks, onDone, onDelete, onEdit,
}: {
  sectionKey: keyof typeof SECTION_CFG;
  tasks: Task[];
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
}) {
  const cfg = SECTION_CFG[sectionKey];
  if (tasks.length === 0) return null;

  return (
    <div className={`rounded-xl overflow-hidden ${cfg.bg} border border-white/5`}>
      <div className={`flex items-center gap-1.5 px-3 py-2 border-b border-white/5`}>
        <span className={cfg.color}>{cfg.icon}</span>
        <span className={`text-[11px] font-bold tracking-widest uppercase ${cfg.color}`}>{cfg.label}</span>
        <span className="ml-auto text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: `${cfg.accent}22`, color: cfg.accent }}>
          {tasks.length}
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {tasks.map(t => (
          <TaskRow key={t.id} task={t} onDone={onDone} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

export function TasksCard() {
  const { data, isLoading, error } = useGetTasks();
  const queryClient = useQueryClient();
  const createTask  = useCreateTask();
  const updateTask  = useUpdateTask();
  const deleteTask  = useDeleteTask();

  const [newTitle, setNewTitle]         = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask]   = useState<Task | null>(null);
  const [editForm, setEditForm]         = useState({ title: "", priority: "", status: "", due_date: "", notes: "" });

  const inv = () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTask.mutate({ data: { title: newTitle.trim(), priority: "Medium", status: "Not started" } },
      { onSuccess: () => { setNewTitle(""); inv(); } });
  };

  const handleMarkDone = (id: string) =>
    updateTask.mutate({ taskId: id, data: { status: "Done" } }, { onSuccess: inv });

  const handleDelete = (id: string) => {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate({ taskId: id }, { onSuccess: inv });
  };

  const handleStartEdit = (t: Task) => {
    setEditingTask(t);
    setEditForm({ title: t.title, priority: t.priority ?? "Medium", status: t.status ?? "Not started", due_date: t.due_date ?? "", notes: t.notes ?? "" });
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    updateTask.mutate({
      taskId: editingTask.id,
      data: { title: editForm.title, priority: editForm.priority as any, status: editForm.status, due_date: editForm.due_date || null, notes: editForm.notes || null },
    }, { onSuccess: () => { setEditingTask(null); inv(); } });
  };

  if (isLoading) return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="h-6 w-40 bg-white/10 rounded animate-pulse" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
    </div>
  );
  if (error) return (
    <div className="glass-card rounded-2xl p-6 text-center text-red-400 text-sm">
      Failed to load tasks. Check Notion connection.
    </div>
  );

  const cat       = data?.categorized ?? { overdue: [], outstanding: [], inProgress: [], todo: [] };
  const completed = data?.completed ?? [];
  const totalActive = (cat.overdue?.length ?? 0) + (cat.outstanding?.length ?? 0) + (cat.inProgress?.length ?? 0) + (cat.todo?.length ?? 0);

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <ListTodo size={17} className="text-blue-400 flex-shrink-0" />
        <h2 className="text-base font-bold text-slate-100 tracking-tight">Tasks & Priorities</h2>
        <span className="text-xs font-semibold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
          {totalActive} active
        </span>
      </div>

      {/* Quick-add */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Quick add a task…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="flex-1 bg-slate-900/60 border border-white/8 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all"
        />
        <button type="submit" disabled={createTask.isPending || !newTitle.trim()}
          className="bg-blue-600/80 hover:bg-blue-500 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </form>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[600px] pr-0.5 custom-scrollbar">
        <Section sectionKey="overdue"     tasks={cat.overdue ?? []}                onDone={handleMarkDone} onDelete={handleDelete} onEdit={handleStartEdit} />
        <Section sectionKey="outstanding" tasks={cat.outstanding ?? []}            onDone={handleMarkDone} onDelete={handleDelete} onEdit={handleStartEdit} />
        <Section sectionKey="inProgress"  tasks={(cat as any).inProgress ?? []}    onDone={handleMarkDone} onDelete={handleDelete} onEdit={handleStartEdit} />
        <Section sectionKey="todo"        tasks={cat.todo ?? []}                   onDone={handleMarkDone} onDelete={handleDelete} onEdit={handleStartEdit} />

        {totalActive === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-2">
            <CheckCircle2 size={28} className="text-emerald-500/50" />
            All clear — no active tasks!
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="border-t border-white/5 pt-3">
            <button onClick={() => setShowCompleted(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors w-full px-1 mb-2">
              {showCompleted ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <CheckCircle2 size={12} className="text-emerald-500/70" />
              Completed ({completed.length})
            </button>
            {showCompleted && (
              <div className="space-y-1 opacity-55">
                {completed.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
                    <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-slate-400 line-through truncate">{t.title}</span>
                    {t.due_date && <span className="text-[11px] text-slate-600 ml-auto flex-shrink-0">{safeDue(t.due_date)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm" onClick={() => setEditingTask(null)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-100 text-sm">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Title</label>
                <input autoFocus type="text" value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all">
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all">
                    <option value="Not started">Not started</option>
                    <option value="In progress">In progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Due Date</label>
                <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Notes</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditingTask(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl py-2 text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={updateTask.isPending}
                className="flex-1 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium transition-all">
                {updateTask.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
