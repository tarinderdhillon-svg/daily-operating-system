import React, { useState, useEffect, useRef } from "react";
import { useGetTasks, useCreateTask, useUpdateTask, useDeleteTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";

export function TasksCard() {
  const { data: tasksResponse, isLoading } = useGetTasks();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; due_date: string; priority: any; status: string }>({
    title: "",
    due_date: "",
    priority: "Medium",
    status: "To-Do"
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTask.mutate({ data: { title: newTaskTitle, priority: "Medium" } }, {
      onSuccess: () => {
        setNewTaskTitle("");
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      }
    });
  };

  const handleEdit = (task: any) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      due_date: task.due_date || "",
      priority: task.priority || "Medium",
      status: task.status || "To-Do"
    });
  };

  const handleSaveEdit = (id: string) => {
    updateTask.mutate({ 
      taskId: id, 
      data: {
        title: editForm.title,
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.due_date || null
      }
    }, {
      onSuccess: () => {
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this task?")) {
      deleteTask.mutate({ taskId: id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() })
      });
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "High": return "#ff6464";
      case "Medium": return "#ffb464";
      case "Low": return "#64ff64";
      default: return "#94a3b8";
    }
  };

  if (isLoading) {
    return <div className="glass-card rounded-2xl p-6 h-[400px] animate-pulse" />;
  }

  const categorized = tasksResponse?.categorized || { overdue: [], outstanding: [], todo: [] };

  const renderSection = (title: string, tasks: any[], colorClass: string, icon: React.ReactNode) => (
    <div className="mb-6 last:mb-0">
      <div className={`flex items-center gap-2 mb-3 text-sm font-semibold tracking-wider uppercase ${colorClass}`}>
        {icon}
        <span>{title}</span>
        <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs ml-auto">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="text-sm text-slate-400 italic px-4 py-2 bg-white/5 rounded-lg border border-white/5">No tasks in this section.</div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const isEditing = editingId === task.id;
            return (
              <div 
                key={task.id} 
                className="group relative bg-slate-800/40 hover:bg-slate-800/60 border border-white/5 rounded-xl p-3 transition-all duration-300 flex items-center justify-between"
                style={{ borderLeftColor: getPriorityColor(task.priority), borderLeftWidth: '4px' }}
              >
                {isEditing ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input 
                      type="text" 
                      className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm flex-1"
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      autoFocus
                    />
                    <select 
                      className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm"
                      value={editForm.priority}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <select 
                      className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm"
                      value={editForm.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="To-Do">To-Do</option>
                      <option value="Outstanding">Outstanding</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    <button onClick={() => handleSaveEdit(task.id)} className="text-green-400 hover:text-green-300 px-2">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300 px-2">Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-200">{task.title}</span>
                      <div className="flex gap-3 text-xs text-slate-400 mt-1">
                        {task.due_date && <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>}
                        <span style={{ color: getPriorityColor(task.priority) }}>{task.priority || 'No Priority'}</span>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={() => handleEdit(task)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-slate-300 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col h-full max-h-[800px]">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-100">
        <CheckCircle className="text-blue-400" /> Tasks & Priorities
      </h2>
      
      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input 
          type="text" 
          placeholder="Add a new task..." 
          className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={createTask.isPending || !newTaskTitle.trim()}
          className="bg-blue-600/80 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} /> Add
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {renderSection("Overdue", categorized.overdue, "text-[#ff6464]", <AlertCircle size={16} />)}
        {renderSection("Outstanding", categorized.outstanding, "text-[#ffb464]", <Clock size={16} />)}
        {renderSection("To-Do", categorized.todo, "text-[#3b82f6]", <CheckCircle size={16} />)}
      </div>
    </div>
  );
}
