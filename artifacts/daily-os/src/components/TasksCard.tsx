import React, { useState } from "react";
import { parseISO, format, isValid } from "date-fns";
import {
  useGetTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getGetTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  due_date?: string | null;
  priority?: "High" | "Medium" | "Low" | null;
  status?: string | null;
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  High:   { color: "#ff6464", bg: "rgba(255,100,100,0.08)", border: "#ff6464" },
  Medium: { color: "#ffb464", bg: "rgba(255,180,100,0.08)", border: "#ffb464" },
  Low:    { color: "#64d864", bg: "rgba(100,216,100,0.08)", border: "#64d864" },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  "In progress": { label: "In Progress", dot: "#60a5fa" },
  "Not started": { label: "Not Started", dot: "#94a3b8" },
  "In Review":   { label: "In Review",   dot: "#c084fc" },
};

function safeDue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, "MMM d") : dateStr;
  } catch { return dateStr; }
}

function TaskRow({
  task,
  onMarkDone,
  onDelete,
  onEdit,
}: {
  task: Task;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const cfg = PRIORITY_CONFIG[task.priority ?? ""] ?? { color: "#64748b", bg: "transparent", border: "#334155" };
  const statusCfg = STATUS_CONFIG[task.status ?? ""] ?? { label: task.status ?? "—", dot: "#64748b" };

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5"
      style={{ borderLeft: `3px solid ${cfg.border}`, paddingLeft: "10px" }}
    >
      <button
        onClick={() => onMarkDone(task.id)}
        className="flex-shrink-0 w-5 h-5 rounded-full border border-slate-600 hover:border-emerald-400 hover:bg-emerald-400/10 transition-all flex items-center justify-center group/check"
        title="Mark as done"
      >
        <Check size={11} className="text-slate-600 group-hover/check:text-emerald-400 transition-colors" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate leading-snug">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.due_date && (
            <span className="text-[11px] text-slate-500 font-mono">{safeDue(task.due_date)}</span>
          )}
          {task.status && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: statusCfg.dot }} />
              {statusCfg.label}
            </span>
          )}
          {task.priority && (
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>
              {task.priority}
            </span>
          )}
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          title="Edit"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  count,
  colorClass,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  colorClass: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      <span className={colorClass}>{icon}</span>
      <span className={`text-xs font-bold tracking-widest uppercase ${colorClass}`}>{label}</span>
      <span
        className="ml-auto text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: `${accent}25`, color: accent }}
      >
        {count}
      </span>
    </div>
  );
}

export function TasksCard() {
  const { data, isLoading, error } = useGetTasks();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [newTitle, setNewTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: "", priority: "", status: "", due_date: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTask.mutate(
      { data: { title: newTitle.trim(), priority: "Medium" } },
      { onSuccess: () => { setNewTitle(""); invalidate(); } }
    );
  };

  const handleMarkDone = (id: string) => {
    updateTask.mutate(
      { taskId: id, data: { status: "Done" } },
      { onSuccess: invalidate }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate({ taskId: id }, { onSuccess: invalidate });
  };

  const handleStartEdit = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      priority: task.priority ?? "Medium",
      status: task.status ?? "Not started",
      due_date: task.due_date ?? "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    updateTask.mutate(
      {
        taskId: editingTask.id,
        data: {
          title: editForm.title,
          priority: editForm.priority as any,
          status: editForm.status,
          due_date: editForm.due_date || null,
        },
      },
      { onSuccess: () => { setEditingTask(null); invalidate(); } }
    );
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl mb-2 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center text-red-400 text-sm">
        Failed to load tasks. Check your Notion connection.
      </div>
    );
  }

  const categorized = data?.categorized ?? { overdue: [], outstanding: [], todo: [] };
  const completed = data?.completed ?? [];
  const totalActive = (categorized.overdue?.length ?? 0) + (categorized.outstanding?.length ?? 0) + (categorized.todo?.length ?? 0);

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <ListTodo size={18} className="text-blue-400" />
          <h2 className="text-base font-bold text-slate-100 tracking-tight">Tasks & Priorities</h2>
          <span className="text-xs font-semibold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
            {totalActive} active
          </span>
        </div>
      </div>

      {/* Quick-add */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-5">
        <input
          type="text"
          placeholder="Quick add a task..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
        />
        <button
          type="submit"
          disabled={createTask.isPending || !newTitle.trim()}
          className="bg-blue-600/80 hover:bg-blue-500 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap"
        >
          <Plus size={14} />
          Add
        </button>
      </form>

      {/* Task sections */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-0.5 max-h-[600px] custom-scrollbar">

        {/* Overdue */}
        {categorized.overdue.length > 0 && (
          <div>
            <SectionHeader
              icon={<AlertTriangle size={13} />}
              label="Overdue"
              count={categorized.overdue.length}
              colorClass="text-red-400"
              accent="#ff6464"
            />
            <div className="space-y-0.5">
              {categorized.overdue.map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onMarkDone={handleMarkDone}
                  onDelete={handleDelete}
                  onEdit={handleStartEdit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Due Soon */}
        {categorized.outstanding.length > 0 && (
          <div>
            <SectionHeader
              icon={<Clock size={13} />}
              label="Due Soon"
              count={categorized.outstanding.length}
              colorClass="text-amber-400"
              accent="#ffb464"
            />
            <div className="space-y-0.5">
              {categorized.outstanding.map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onMarkDone={handleMarkDone}
                  onDelete={handleDelete}
                  onEdit={handleStartEdit}
                />
              ))}
            </div>
          </div>
        )}

        {/* To-Do */}
        {categorized.todo.length > 0 && (
          <div>
            <SectionHeader
              icon={<Circle size={13} />}
              label="To-Do"
              count={categorized.todo.length}
              colorClass="text-slate-400"
              accent="#94a3b8"
            />
            <div className="space-y-0.5">
              {categorized.todo.map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onMarkDone={handleMarkDone}
                  onDelete={handleDelete}
                  onEdit={handleStartEdit}
                />
              ))}
            </div>
          </div>
        )}

        {totalActive === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500/50" />
            All clear — no active tasks!
          </div>
        )}

        {/* Completed (collapsible) */}
        {completed.length > 0 && (
          <div className="border-t border-white/5 pt-4">
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors w-full px-1"
            >
              {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <CheckCircle2 size={13} className="text-emerald-500/70" />
              <span>Completed ({completed.length})</span>
            </button>
            {showCompleted && (
              <div className="mt-2 space-y-0.5 opacity-60">
                {completed.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-slate-400 line-through truncate">{t.title}</span>
                    {t.due_date && (
                      <span className="text-[11px] text-slate-600 ml-auto flex-shrink-0">{safeDue(t.due_date)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-100 text-sm">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1 block">Title</label>
                <input
                  autoFocus
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1 block">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1 block">Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="Not started">Not started</option>
                    <option value="In progress">In progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl py-2 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateTask.isPending}
                className="flex-1 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium transition-all"
              >
                {updateTask.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
