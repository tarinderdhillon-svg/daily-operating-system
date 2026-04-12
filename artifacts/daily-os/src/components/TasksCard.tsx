import React, { useState, useEffect, useRef, useCallback } from "react";
import { parseISO, format, isValid, isBefore, startOfDay } from "date-fns";
import {
  useGetTasks, useCreateTask, useUpdateTask, useDeleteTask, getGetTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit2, Trash2, CheckCircle2, Circle, ChevronLeft, ChevronRight,
  ListTodo, X, AlertTriangle, FolderOpen,
} from "lucide-react";

type Task = {
  id: string; title: string;
  due_date?: string | null; priority?: "Urgent" | "High" | "Medium" | "Low" | null;
  status?: string | null; notes?: string | null; project_id?: string | null;
};

type Project = { id: string; name: string };

const STATUS_PIPELINE = ["Not started", "In progress", "In Review", "Done"] as const;
type KanbanStatus = typeof STATUS_PIPELINE[number];

const COLUMN_CFG: Record<KanbanStatus, { label: string; accent: string; bg: string; border: string; headerBg: string }> = {
  "Not started": { label: "Not Started", accent: "#64748b", bg: "bg-slate-500/[0.04]",  border: "border-slate-500/10",  headerBg: "bg-slate-500/10"  },
  "In progress": { label: "In Progress", accent: "#818cf8", bg: "bg-indigo-500/[0.04]", border: "border-indigo-500/15", headerBg: "bg-indigo-500/10" },
  "In Review":   { label: "In Review",   accent: "#fbbf24", bg: "bg-amber-500/[0.04]",  border: "border-amber-500/15", headerBg: "bg-amber-500/10"  },
  "Done":        { label: "Done",         accent: "#4ade80", bg: "bg-emerald-500/[0.04]",border: "border-emerald-500/15",headerBg: "bg-emerald-500/10"},
};

const PRIORITY_COLOR: Record<string, string> = {
  Urgent: "#f87171", High: "#fb923c", Medium: "#fbbf24", Low: "#4ade80",
};

function safeDue(d: string | null | undefined) {
  if (!d) return null;
  try { const dt = parseISO(d); return isValid(dt) ? format(dt, "MMM d") : d; } catch { return d; }
}

function isOverdue(due_date: string | null | undefined) {
  if (!due_date) return false;
  try { return isBefore(startOfDay(parseISO(due_date)), startOfDay(new Date())); } catch { return false; }
}

/* ─── Kanban Card ───────────────────────────────────────────────────────── */

function KanbanCard({
  task, pipeline, onMove, onEdit, onDone, onDelete,
  isDragging, onDragStart, onDragEnd,
  onTouchStart, onTouchMove, onTouchEnd,
}: {
  task: Task;
  pipeline: KanbanStatus[];
  onMove: (id: string, status: KanbanStatus) => void;
  onEdit: (t: Task) => void;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onTouchStart: (id: string, e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  const due     = safeDue(task.due_date);
  const overdue = isOverdue(task.due_date) && task.status !== "Done";
  const pColor  = PRIORITY_COLOR[task.priority ?? ""] ?? "#64748b";
  const curIdx  = pipeline.indexOf((task.status ?? "Not started") as KanbanStatus);
  const canLeft  = curIdx > 0;
  const canRight = curIdx < pipeline.length - 1;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(task.id, e)}
      onDragEnd={onDragEnd}
      onTouchStart={e => onTouchStart(task.id, e)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`group relative rounded-2xl border p-3 transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? "opacity-40 scale-[0.98]"
          : overdue
            ? "border-red-500/25 bg-red-500/[0.04]"
            : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
      style={{ borderLeftWidth: "3px", borderLeftColor: overdue ? "#f87171" : pColor + "66" }}
    >
      <p className="text-[13px] font-medium text-slate-200 leading-snug mb-1.5">{task.title}</p>

      <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
        {overdue && (
          <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-semibold">
            <AlertTriangle size={9} />
            Overdue
          </span>
        )}
        {due && !overdue && (
          <span className="text-[11px] text-slate-500 font-mono">{due}</span>
        )}
        {due && overdue && (
          <span className="text-[11px] text-red-500/70 font-mono">{due}</span>
        )}
        {task.priority && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ color: pColor, background: pColor + "18" }}>
            {task.priority}
          </span>
        )}
      </div>

      {task.notes && (
        <p className="text-[11px] text-slate-600 mt-1 truncate italic">"{task.notes}"</p>
      )}

      {/* Action row — always visible on mobile, hover-only on desktop */}
      <div className="flex items-center gap-0.5 mt-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => canLeft && onMove(task.id, pipeline[curIdx - 1])}
          disabled={!canLeft}
          title={canLeft ? `Move to ${pipeline[curIdx - 1]}` : undefined}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
        >
          <ChevronLeft size={12} />
        </button>
        <button
          onClick={() => canRight && onMove(task.id, pipeline[curIdx + 1])}
          disabled={!canRight}
          title={canRight ? `Move to ${pipeline[curIdx + 1]}` : undefined}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
        >
          <ChevronRight size={12} />
        </button>

        <div className="flex-1" />

        <button onClick={() => onDone(task.id)} title="Mark done"
          className="p-1 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors">
          <CheckCircle2 size={12} />
        </button>
        <button onClick={() => onEdit(task)} title="Edit"
          className="p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.08] transition-colors">
          <Edit2 size={12} />
        </button>
        <button onClick={() => onDelete(task.id)} title="Delete"
          className="p-1 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── Main TasksCard ─────────────────────────────────────────────────────── */

export function TasksCard() {
  const { data, isLoading, error } = useGetTasks();
  const queryClient = useQueryClient();
  const createTask  = useCreateTask();
  const updateTask  = useUpdateTask();
  const deleteTask  = useDeleteTask();

  const [newTitle, setNewTitle]       = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm]       = useState({ title: "", priority: "", status: "", due_date: "", notes: "", project_id: "" });
  const [projects, setProjects]       = useState<Project[]>([]);
  const [showDone, setShowDone]       = useState(false);

  // ── Drag-and-drop state ──────────────────────────────────────────────────
  const [draggingId, setDraggingId]           = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus]   = useState<KanbanStatus | null>(null);
  const [touchDragOverCol, setTouchDragOverCol] = useState<KanbanStatus | null>(null);
  const columnRefs = useRef<Partial<Record<KanbanStatus, HTMLDivElement | null>>>({});
  const touchState = useRef<{
    id: string; startX: number; startY: number; active: boolean; overStatus: KanbanStatus | null;
  }>({ id: "", startX: 0, startY: 0, active: false, overStatus: null });

  const baseUrl = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const inv = () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });

  useEffect(() => {
    if (!editingTask) return;
    fetch(`${baseUrl}/api/tasks/projects`)
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .catch(() => {});
  }, [editingTask, baseUrl]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTask.mutate(
      { data: { title: newTitle.trim(), priority: "Medium", status: "Not started" } },
      { onSuccess: () => { setNewTitle(""); inv(); } }
    );
  };

  const handleMove = useCallback((id: string, status: KanbanStatus) => {
    updateTask.mutate({ taskId: id, data: { status } }, { onSuccess: inv });
  }, [updateTask]);

  const handleMarkDone = (id: string) =>
    updateTask.mutate({ taskId: id, data: { status: "Done" } }, { onSuccess: inv });

  const handleDelete = (id: string) => {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate({ taskId: id }, { onSuccess: inv });
  };

  const handleStartEdit = (t: Task) => {
    setEditingTask(t);
    setEditForm({
      title: t.title,
      priority: t.priority ?? "Medium",
      status: t.status ?? "Not started",
      due_date: t.due_date ?? "",
      notes: t.notes ?? "",
      project_id: t.project_id ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    await fetch(`${baseUrl}/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        priority: editForm.priority || null,
        status: editForm.status || null,
        due_date: editForm.due_date || null,
        notes: editForm.notes || null,
        project_id: editForm.project_id || null,
      }),
    });
    setEditingTask(null);
    inv();
  };

  // ── HTML5 Drag handlers ──────────────────────────────────────────────────
  const handleDragStart = (id: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStatus(null);
  };

  const handleColumnDragOver = (status: KanbanStatus, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleColumnDrop = (status: KanbanStatus, e: React.DragEvent) => {
    e.preventDefault();
    if (draggingId) handleMove(draggingId, status);
    setDraggingId(null);
    setDragOverStatus(null);
  };

  const handleColumnDragLeave = (e: React.DragEvent, col: HTMLDivElement | null) => {
    if (!col) return;
    if (!col.contains(e.relatedTarget as Node)) {
      setDragOverStatus(null);
    }
  };

  // ── Touch Drag handlers ──────────────────────────────────────────────────
  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchState.current = { id, startX: touch.clientX, startY: touch.clientY, active: false, overStatus: null };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const ts = touchState.current;
    const dx = Math.abs(touch.clientX - ts.startX);
    const dy = Math.abs(touch.clientY - ts.startY);

    // Activate drag mode after 8px horizontal movement (or 8px any direction)
    if (!ts.active && (dx > 8 || dy > 8)) {
      ts.active = true;
    }
    if (!ts.active) return;

    e.preventDefault(); // prevent scroll only when dragging

    // Determine which column the finger is over using bounding rects
    let foundStatus: KanbanStatus | null = null;
    for (const status of (STATUS_PIPELINE.slice(0, 3) as KanbanStatus[])) {
      const ref = columnRefs.current[status];
      if (!ref) continue;
      const rect = ref.getBoundingClientRect();
      if (
        touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top  && touch.clientY <= rect.bottom
      ) {
        foundStatus = status;
        break;
      }
    }
    ts.overStatus = foundStatus;
    setTouchDragOverCol(foundStatus);
  };

  const handleTouchEnd = (_e: React.TouchEvent) => {
    const ts = touchState.current;
    if (ts.active && ts.id && ts.overStatus) {
      handleMove(ts.id, ts.overStatus);
    }
    touchState.current = { id: "", startX: 0, startY: 0, active: false, overStatus: null };
    setTouchDragOverCol(null);
  };

  if (isLoading) return (
    <div className="bento-card rounded-3xl p-5 space-y-3">
      <div className="h-5 w-36 bg-white/8 rounded-full animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="bento-card rounded-3xl p-6 text-center text-red-400 text-sm">
      Failed to load tasks. Check Notion connection.
    </div>
  );

  const allTasks = (data?.tasks ?? []) as Task[];
  const activePipeline = STATUS_PIPELINE.slice(0, 3) as unknown as KanbanStatus[];

  const byStatus: Record<KanbanStatus, Task[]> = {
    "Not started": [], "In progress": [], "In Review": [], "Done": [],
  };
  for (const t of allTasks) {
    const s = (t.status ?? "Not started") as KanbanStatus;
    if (s in byStatus) byStatus[s].push(t);
    else byStatus["Not started"].push(t);
  }
  const doneTasks = [...byStatus["Done"], ...(data?.completed ?? []) as Task[]];
  const totalActive = allTasks.filter(t => (t.status ?? "").toLowerCase() !== "done").length;

  return (
    <div className="bento-card rounded-3xl p-5">

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <ListTodo size={16} className="text-indigo-400 flex-shrink-0" />
        <h2 className="text-sm font-semibold text-white tracking-tight">Action Items</h2>
        <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
          {totalActive} active
        </span>
        <span className="ml-auto text-[10px] text-slate-600 font-mono hidden md:block">drag cards to move between columns</span>
      </div>

      {/* Quick-add */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Quick add a task…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
        <button type="submit" disabled={createTask.isPending || !newTitle.trim()}
          className="bg-indigo-600/80 hover:bg-indigo-500 disabled:opacity-40 text-white px-3.5 py-2 rounded-2xl text-sm font-medium transition-all flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </form>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 lg:snap-none -mx-1 px-1">
        {activePipeline.map(status => {
          const cfg   = COLUMN_CFG[status];
          const tasks = byStatus[status];
          const isOver = dragOverStatus === status || touchDragOverCol === status;

          return (
            <div
              key={status}
              ref={el => { columnRefs.current[status] = el; }}
              data-kanban-col={status}
              onDragOver={e => handleColumnDragOver(status, e)}
              onDragLeave={e => handleColumnDragLeave(e, columnRefs.current[status] ?? null)}
              onDrop={e => handleColumnDrop(status, e)}
              className={`rounded-2xl border flex flex-col min-w-[260px] flex-shrink-0 snap-start lg:min-w-0 lg:flex-shrink transition-all ${
                isOver
                  ? `border-indigo-400/50 bg-indigo-500/10 ring-1 ring-indigo-400/30`
                  : `${cfg.border} ${cfg.bg}`
              }`}
            >
              {/* Column header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-t-2xl ${cfg.headerBg}`}>
                <span className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: cfg.accent }}>{cfg.label}</span>
                <span className="ml-auto text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center"
                  style={{ background: cfg.accent + "22", color: cfg.accent }}>
                  {tasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2 min-h-[80px]">
                {tasks.length === 0 && (
                  <div className={`flex items-center justify-center py-4 rounded-xl border-2 border-dashed transition-all ${
                    isOver ? "border-indigo-400/40 bg-indigo-500/5" : "border-transparent"
                  }`}>
                    <Circle size={14} className={isOver ? "text-indigo-400" : "text-slate-700"} />
                  </div>
                )}
                {tasks.map(t => (
                  <KanbanCard
                    key={t.id}
                    task={t}
                    pipeline={STATUS_PIPELINE as unknown as KanbanStatus[]}
                    onMove={handleMove}
                    onEdit={handleStartEdit}
                    onDone={handleMarkDone}
                    onDelete={handleDelete}
                    isDragging={draggingId === t.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Done toggle */}
      {doneTasks.length > 0 && (
        <div className="mt-3 border-t border-white/[0.05] pt-3">
          <button
            onClick={() => setShowDone(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-400 transition-colors w-full"
          >
            <CheckCircle2 size={12} className="text-emerald-500/60" />
            Completed ({doneTasks.length})
            <ChevronRight size={12} className={`ml-auto transition-transform ${showDone ? "rotate-90" : ""}`} />
          </button>
          {showDone && (
            <div className="mt-2 space-y-1 opacity-60">
              {doneTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl">
                  <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-slate-400 line-through truncate">{t.title}</span>
                  {t.due_date && <span className="text-[11px] text-slate-600 ml-auto flex-shrink-0">{safeDue(t.due_date)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setEditingTask(null)}>
          <div className="bg-[#0d0d1a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-100 text-sm">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Title</label>
                <input autoFocus type="text" value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none">
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none">
                    <option value="Not started">Not started</option>
                    <option value="In progress">In progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Due Date</label>
                <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all" />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5 block">
                  <FolderOpen size={10} />
                  Related Project
                </label>
                <select value={editForm.project_id} onChange={e => setEditForm(f => ({ ...f, project_id: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none">
                  <option value="">— No project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">Notes</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all resize-none" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditingTask(null)}
                className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 rounded-2xl py-2 text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={handleSaveEdit}
                className="flex-1 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-2xl py-2 text-sm font-medium transition-all">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
