"use client";

import {
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  History,
  MessageSquarePlus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBug,
  deleteBug,
  listBugs,
  transitionStatus,
  updateBug,
} from "@/lib/bugs/repository";
import { filterBugsByQueryAndStatus } from "@/lib/bugs/filter";
import { sortBugsByOption, BUG_SORT_OPTIONS, type BugSortOption } from "@/lib/bugs/sort";
import { getAllowedTransitions, canTransitionStatus } from "@/lib/bugs/transitions";
import type { Bug, BugPriority, BugStatus } from "@/types/bug";
import { BUG_PRIORITIES, BUG_STATUSES } from "@/types/bug";

const MAX_DESCRIPTION_LENGTH = 1000;

type BugFormState = {
  title: string;
  description: string;
  priority: BugPriority;
};

const initialCreateForm: BugFormState = {
  title: "",
  description: "",
  priority: "medium",
};

function formatDateTime(date: Date | null): string {
  if (!date) {
    return "pending server timestamp";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function priorityStyles(priority: BugPriority): string {
  if (priority === "critical") {
    return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  }

  if (priority === "high") {
    return "border-orange-500/40 bg-orange-500/15 text-orange-200";
  }

  if (priority === "medium") {
    return "border-sky-500/40 bg-sky-500/15 text-sky-200";
  }

  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
}

function createOptimisticBug(form: BugFormState, tempId: string): Bug {
  const now = new Date();

  return {
    id: tempId,
    title: form.title.trim(),
    description: form.description.trim(),
    status: "new",
    priority: form.priority,
    tags: [],
    statusLog: [],
    createdAt: now,
    updatedAt: now,
    hasPendingServerTimestamps: true,
  };
}

function applyBugReplacement(bugs: Bug[], bugId: string, nextBug: Bug): Bug[] {
  return bugs.map((bug) => (bug.id === bugId ? nextBug : bug));
}

function applyBugRemoval(bugs: Bug[], bugId: string): Bug[] {
  return bugs.filter((bug) => bug.id !== bugId);
}

function countPendingBugs(bugs: Bug[]): number {
  return bugs.filter((bug) => bug.hasPendingServerTimestamps).length;
}

const STATUS_ACCENT: Record<BugStatus, string> = {
  new: "border-sky-400/60 bg-sky-400/15",
  "in progress": "border-amber-400/60 bg-amber-400/15",
  resolved: "border-emerald-400/60 bg-emerald-400/15",
  invalid: "border-rose-400/60 bg-rose-400/15",
  closed: "border-slate-400/60 bg-slate-400/15",
  reopened: "border-indigo-400/60 bg-indigo-400/15",
};


export function BugBoard() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [confirmedBugs, setConfirmedBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<BugFormState>(initialCreateForm);
  const [editingBugId, setEditingBugId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BugFormState>(initialCreateForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<BugStatus[]>([...BUG_STATUSES]);
  const [sortOption, setSortOption] = useState<BugSortOption>("updatedAt");

  // Transition-with-comment modal
  const [transitionPending, setTransitionPending] = useState<{ bugId: string; nextStatus: BugStatus } | null>(null);
  const [commentText, setCommentText] = useState("");

  // Drag and drop
  const [draggingBugId, setDraggingBugId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<BugStatus | null>(null);

  // History popup
  const [historyBugId, setHistoryBugId] = useState<string | null>(null);

  const tempIdRef = useRef(0);

  const sortVisibleBugs = useCallback(
    (nextBugs: Bug[]) => sortBugsByOption(nextBugs, sortOption),
    [sortOption],
  );

  const filteredBugs = useMemo(() => {
    return sortVisibleBugs(filterBugsByQueryAndStatus(bugs, searchQuery, activeStatuses));
  }, [activeStatuses, bugs, searchQuery, sortVisibleBugs]);

  const groupedBugs = useMemo(() => {
    const initial = BUG_STATUSES.reduce(
      (acc, status) => {
        acc[status] = [];
        return acc;
      },
      {} as Record<BugStatus, Bug[]>,
    );

    filteredBugs.forEach((bug) => {
      initial[bug.status].push(bug);
    });

    return initial;
  }, [filteredBugs]);

  const syncCount = useMemo(() => countPendingBugs(bugs), [bugs]);
  const openBugCount = useMemo(
    () => bugs.filter((bug) => bug.status !== "closed" && bug.status !== "resolved" && bug.status !== "invalid").length,
    [bugs],
  );
  const visibleBugCount = filteredBugs.length;

  const refreshBugs = useCallback(async () => {
    setError(null);
    const nextBugs = sortVisibleBugs(await listBugs());
    setBugs(nextBugs);
    setConfirmedBugs(nextBugs);
  }, [sortVisibleBugs]);

  const loadInitialBugs = useCallback(async () => {
    setIsLoading(true);

    try {
      await refreshBugs();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load bugs.");
    } finally {
      setIsLoading(false);
    }
  }, [refreshBugs]);

  useEffect(() => {
    void loadInitialBugs();
  }, [loadInitialBugs]);

  useEffect(() => {
    setBugs((currentBugs) => sortVisibleBugs(currentBugs));
    setConfirmedBugs((currentBugs) => sortVisibleBugs(currentBugs));
  }, [sortVisibleBugs]);

  const rollbackToConfirmed = useCallback(
    (message: string) => {
      setBugs(sortVisibleBugs(confirmedBugs));
      setError(message);
      setNotice("Rolled back to the last confirmed Firestore state.");
    },
    [confirmedBugs, sortVisibleBugs],
  );

  function toggleStatusFilter(status: BugStatus) {
    setActiveStatuses((currentStatuses) => {
      if (currentStatuses.includes(status)) {
        const nextStatuses = currentStatuses.filter((currentStatus) => currentStatus !== status);
        return nextStatuses.length === 0 ? [...BUG_STATUSES] : nextStatuses;
      }

      return [...currentStatuses, status];
    });
  }

  function resetStatusFilters() {
    setActiveStatuses([...BUG_STATUSES]);
  }

  async function handleCreateBug(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = createForm.title.trim();
    const description = createForm.description.trim();

    if (!title) {
      setError("Title is required.");
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice("Creating bug...");

    const tempId = `temp-${Date.now()}-${tempIdRef.current++}`;
    const optimisticBug = createOptimisticBug(createForm, tempId);
    setBugs((currentBugs) => sortVisibleBugs([optimisticBug, ...currentBugs]));
    setCreateForm(initialCreateForm);

    try {
      const createdBug = await createBug({
        title,
        description,
        priority: createForm.priority,
      });

      setBugs((currentBugs) => sortVisibleBugs(applyBugReplacement(currentBugs, tempId, createdBug)));
      setConfirmedBugs((currentBugs) => sortVisibleBugs([createdBug, ...currentBugs]));
      setNotice("Bug created and synced.");
    } catch (saveError) {
      rollbackToConfirmed(saveError instanceof Error ? saveError.message : "Failed to create bug.");
    } finally {
      setIsSaving(false);
    }
  }

  function openEditForm(bug: Bug) {
    setEditingBugId(bug.id);
    setEditForm({
      title: bug.title,
      description: bug.description,
      priority: bug.priority,
    });
    setError(null);
  }

  function closeEditForm() {
    setEditingBugId(null);
    setEditForm(initialCreateForm);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingBugId) {
      return;
    }

    const title = editForm.title.trim();
    const description = editForm.description.trim();

    if (!title) {
      setError("Title is required.");
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }

    const existingBug = bugs.find((bug) => bug.id === editingBugId);
    if (!existingBug) {
      return;
    }

    const optimisticBug: Bug = {
      ...existingBug,
      title,
      description,
      priority: editForm.priority,
      updatedAt: new Date(),
      hasPendingServerTimestamps: true,
    };

    setIsSaving(true);
    setError(null);
    setNotice("Saving bug changes...");
    setBugs((currentBugs) => sortVisibleBugs(applyBugReplacement(currentBugs, editingBugId, optimisticBug)));

    try {
      const updatedBug = await updateBug(editingBugId, {
        title,
        description,
        priority: editForm.priority,
      });

      setBugs((currentBugs) => sortVisibleBugs(applyBugReplacement(currentBugs, editingBugId, updatedBug)));
      setConfirmedBugs((currentBugs) => sortVisibleBugs(applyBugReplacement(currentBugs, editingBugId, updatedBug)));
      setNotice("Bug changes synced.");
      closeEditForm();
    } catch (saveError) {
      rollbackToConfirmed(saveError instanceof Error ? saveError.message : "Failed to update bug.");
    } finally {
      setIsSaving(false);
    }
  }

  async function executeTransition(bugId: string, nextStatus: BugStatus, comment: string) {
    const existingBug = bugs.find((bug) => bug.id === bugId);
    if (!existingBug) return;

    const optimisticBug: Bug = {
      ...existingBug,
      status: nextStatus,
      updatedAt: new Date(),
      hasPendingServerTimestamps: true,
    };

    setIsSaving(true);
    setError(null);
    setNotice(`Moving to "${nextStatus}"…`);
    setBugs((currentBugs) => sortVisibleBugs(applyBugReplacement(currentBugs, bugId, optimisticBug)));

    try {
      const updatedBug = await transitionStatus(bugId, nextStatus, comment);
      setBugs((currentBugs) => sortVisibleBugs(applyBugReplacement(currentBugs, bugId, updatedBug)));
      setConfirmedBugs((currentBugs) => sortVisibleBugs(applyBugReplacement(currentBugs, bugId, updatedBug)));
      setNotice(`Moved to "${nextStatus}".`);
    } catch (transitionError) {
      rollbackToConfirmed(transitionError instanceof Error ? transitionError.message : "Failed to move bug.");
    } finally {
      setIsSaving(false);
    }
  }

  function requestTransition(bugId: string, nextStatus: BugStatus) {
    setTransitionPending({ bugId, nextStatus });
    setCommentText("");
  }

  async function confirmTransition() {
    if (!transitionPending) return;
    const { bugId, nextStatus } = transitionPending;
    setTransitionPending(null);
    await executeTransition(bugId, nextStatus, commentText);
    setCommentText("");
  }

  function cancelTransition() {
    setTransitionPending(null);
    setCommentText("");
  }

  function handleDragStart(bugId: string) {
    setDraggingBugId(bugId);
  }

  function handleDragEnd() {
    setDraggingBugId(null);
    setDragOverStatus(null);
  }

  function handleDragOver(event: React.DragEvent, status: BugStatus) {
    event.preventDefault();
    if (!draggingBugId) return;
    setDragOverStatus(status);
  }

  function handleDragLeave(event: React.DragEvent) {
    // Only clear when leaving the column entirely (not its children)
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      setDragOverStatus(null);
    }
  }

  function handleDrop(event: React.DragEvent, status: BugStatus) {
    event.preventDefault();
    setDragOverStatus(null);
    if (!draggingBugId) return;
    const bug = bugs.find((b) => b.id === draggingBugId);
    setDraggingBugId(null);
    if (!bug || bug.status === status) return;
    if (!canTransitionStatus(bug.status, status)) {
      setError(`Cannot move "${bug.title}" from "${bug.status}" to "${status}".`);
      return;
    }
    requestTransition(draggingBugId, status);
  }

  async function handleDelete(bugId: string) {
    setIsSaving(true);
    setError(null);
    setNotice("Deleting bug...");
    setBugs((currentBugs) => sortVisibleBugs(applyBugRemoval(currentBugs, bugId)));

    try {
      await deleteBug(bugId);
      setConfirmedBugs((currentBugs) => sortVisibleBugs(applyBugRemoval(currentBugs, bugId)));
      if (editingBugId === bugId) {
        closeEditForm();
      }
      setNotice("Bug deleted.");
    } catch (deleteError) {
      rollbackToConfirmed(deleteError instanceof Error ? deleteError.message : "Failed to delete bug.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
    <div className="space-y-4">
      <section className="panel rounded-2xl p-4 sm:p-5">
        {/* Board toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Issues</h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs text-[var(--muted)]">
                <FolderKanban className="h-3 w-3" />
                {bugs.length} total
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs text-[var(--muted)]">
                <CircleDot className="h-3 w-3" />
                {openBugCount} active
              </span>
              {visibleBugCount !== bugs.length && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs text-[var(--muted)]">
                  <Clock3 className="h-3 w-3" />
                  {visibleBugCount} shown
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syncCount > 0 && (
              <span className="text-xs text-[var(--muted)]">
                Syncing {syncCount}…
              </span>
            )}
            <button
              type="button"
              className="control-chip inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5"
              onClick={() => void loadInitialBugs()}
              disabled={isSaving || isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 lg:grid-cols-[1.2fr_0.8fr_1.4fr]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Search</span>
            <span className="soft-input flex items-center gap-2 px-3 py-2">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Search title or description"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Sort</span>
            <span className="soft-input flex items-center gap-2 px-3 py-2">
              <SlidersHorizontal className="h-4 w-4 text-[var(--muted)]" />
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as BugSortOption)}
                className="w-full bg-transparent text-sm outline-none"
              >
                {BUG_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "updatedAt" ? "Recently updated" : option === "createdAt" ? "Recently created" : "Priority"}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <div className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Status filters</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetStatusFilters}
                className="control-chip px-3 py-2 text-xs font-semibold"
              >
                Show all
              </button>
              {BUG_STATUSES.map((status) => {
                const isActive = activeStatuses.includes(status);

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatusFilter(status)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold capitalize transition ${
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateBug} className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex-1">
              <input
                type="text"
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                className="soft-input w-full px-3 py-2 text-sm outline-none"
                placeholder="New issue title…"
                aria-label="Issue title"
              />
            </div>
            <textarea
              value={createForm.description}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
              className="soft-input min-h-[2.375rem] flex-1 resize-none px-3 py-2 text-sm outline-none sm:max-w-xs"
              placeholder="Description (optional)"
              rows={1}
              aria-label="Issue description"
            />
            <select
              value={createForm.priority}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  priority: event.target.value as BugPriority,
                }))
              }
              className="soft-input px-3 py-2 text-sm outline-none"
              aria-label="Priority"
            >
              {BUG_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isLoading || !createForm.title.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add issue
            </button>
          </div>
          {createForm.description.length > 0 && (
            <p className="mt-1.5 text-right text-xs text-[var(--muted)]">{createForm.description.length}/{MAX_DESCRIPTION_LENGTH}</p>
          )}
        </form>

        {notice ? (
          <p aria-live="polite" className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--muted)]">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p aria-live="assertive" role="alert" className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2.5 text-xs text-rose-500 dark:text-rose-300">{error}</p>
        ) : null}
      </section>

      {isLoading ? (
        <section className="flex gap-4 overflow-x-auto pb-2">
          {BUG_STATUSES.map((status) => (
            <div key={status} className="board-column w-[280px] shrink-0 p-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--line)]" />
              <div className="mt-3 space-y-2">
                <div className="h-16 animate-pulse rounded-xl bg-[var(--line)]" />
                <div className="h-16 animate-pulse rounded-xl bg-[var(--line)]" />
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="overflow-x-auto pb-2">
          <div className="grid min-w-max grid-flow-col auto-cols-[minmax(280px,1fr)] gap-3">
            {BUG_STATUSES.map((status) => {
              const columnBugs = groupedBugs[status];
              const isStatusVisible = activeStatuses.includes(status);

              return (
                <article
                  key={status}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                  className={`board-column flex flex-col p-3 transition-all ${
                    isStatusVisible ? "opacity-100" : "opacity-40"
                  } ${
                    dragOverStatus === status ? "ring-2 ring-inset ring-[var(--accent)]/60" : ""
                  }`}
                >
                  {/* Column header */}
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      <span className={`h-2 w-2 rounded-full ${STATUS_ACCENT[status]}`} />
                      {status}
                    </h3>
                    <span className="text-xs font-semibold tabular-nums text-[var(--muted)]">{columnBugs.length}</span>
                  </div>

                  {/* Cards */}
                  {columnBugs.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--line)] py-8">
                      <p className="text-xs text-[var(--muted)]">
                        {isStatusVisible ? "No issues" : "Hidden by filter"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {columnBugs.map((bug) => {
                        const isEditing = editingBugId === bug.id;

                        return (
                          <div
                            key={bug.id}
                            draggable={!isEditing}
                            onDragStart={!isEditing ? () => handleDragStart(bug.id) : undefined}
                            onDragEnd={!isEditing ? handleDragEnd : undefined}
                            className={`board-card p-3 transition-all duration-150 ${
                              draggingBugId === bug.id
                                ? "opacity-40 scale-[0.97] cursor-grabbing"
                                : !isEditing
                                  ? "hover:-translate-y-px cursor-grab active:cursor-grabbing"
                                  : ""
                            } ${bug.hasPendingServerTimestamps ? "ring-1 ring-[var(--accent)]/40" : ""}`}
                          >
                            {isEditing ? (
                              <form onSubmit={handleSaveEdit} className="space-y-2.5">
                                <input
                                  type="text"
                                  value={editForm.title}
                                  onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                                  className="soft-input w-full px-2.5 py-1.5 text-sm outline-none"
                                  aria-label="Title"
                                />
                                <textarea
                                  value={editForm.description}
                                  onChange={(event) =>
                                    setEditForm((prev) => ({ ...prev, description: event.target.value }))
                                  }
                                  className="soft-input h-16 w-full px-2.5 py-1.5 text-sm outline-none"
                                  aria-label="Description"
                                />
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editForm.priority}
                                    onChange={(event) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        priority: event.target.value as BugPriority,
                                      }))
                                    }
                                    className="soft-input flex-1 px-2.5 py-1.5 text-xs"
                                    aria-label="Priority"
                                  >
                                    {BUG_PRIORITIES.map((priority) => (
                                      <option key={priority} value={priority}>{priority}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="control-chip inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold"
                                  >
                                    <Save className="h-3 w-3" />
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={closeEditForm}
                                    className="control-chip inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                {/* Card header */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-medium leading-tight">{bug.title}</h4>
                                  <span
                                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles(bug.priority)}`}
                                  >
                                    {bug.priority}
                                  </span>
                                </div>

                                {/* Description */}
                                {bug.description ? (
                                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)] line-clamp-3">{bug.description}</p>
                                ) : null}

                                {/* Meta */}
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-[var(--muted)]">
                                    {formatDateTime(bug.updatedAt)}
                                  </span>
                                  {bug.hasPendingServerTimestamps && (
                                    <span className="text-[10px] text-[var(--accent)]">syncing…</span>
                                  )}
                                </div>

                                {/* Last status comment */}
                                {bug.statusLog.length > 0 && bug.statusLog[bug.statusLog.length - 1].comment ? (
                                  <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5">
                                    <MessageSquarePlus className="mt-0.5 h-3 w-3 shrink-0 text-[var(--muted)]" />
                                    <p className="line-clamp-2 text-[10px] leading-relaxed text-[var(--muted)]">
                                      {bug.statusLog[bug.statusLog.length - 1].comment}
                                    </p>
                                  </div>
                                ) : null}

                                {/* Management actions — edit / delete / history */}
                                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openEditForm(bug)}
                                      className="control-chip inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold"
                                      aria-label="Edit issue"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(bug.id)}
                                      className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-2 py-1 text-[10px] font-semibold text-rose-500 hover:bg-rose-500/10 dark:text-rose-300"
                                      aria-label="Delete issue"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </button>
                                  </div>
                                  {bug.statusLog.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setHistoryBugId(bug.id)}
                                      className="control-chip inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold"
                                      aria-label="View status history"
                                    >
                                      <History className="h-3 w-3" />
                                      History
                                      <span className="rounded-full bg-[var(--accent)]/15 px-1 tabular-nums text-[var(--accent)]">
                                        {bug.statusLog.length}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {/* Status transitions — visually separated */}
                                {getAllowedTransitions(bug.status).length > 0 && (
                                  <div className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5">
                                    <p className="mb-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                                      Move to
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {getAllowedTransitions(bug.status).map((nextStatus) => (
                                        <button
                                          key={`${bug.id}-${nextStatus}`}
                                          type="button"
                                          onClick={() => requestTransition(bug.id, nextStatus)}
                                          disabled={isSaving}
                                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-medium capitalize hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/8 disabled:opacity-50"
                                        >
                                          <CheckCircle2 className="h-3 w-3 text-[var(--accent)]" />
                                          {nextStatus}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>

      {/* Transition comment modal */}
      {transitionPending ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add a transition note"
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={cancelTransition}
          />
          <div className="panel relative w-full max-w-md space-y-4 rounded-2xl p-5">
            <div>
              <h3 className="text-sm font-semibold">
                Move to{" "}
                <span className="capitalize text-[var(--accent)]">{transitionPending.nextStatus}</span>
              </h3>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Add an optional note explaining this status change.
              </p>
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void confirmTransition();
                if (e.key === "Escape") cancelTransition();
              }}
              placeholder="e.g. Reproduced on staging, moving forward…"
              className="soft-input h-24 w-full px-3 py-2 text-sm outline-none"
              autoFocus
            />
            <p className="text-right text-xs text-[var(--muted)]">
              Tip: ⌘⏎ / Ctrl⏎ to confirm
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelTransition}
                className="control-chip px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmTransition()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                Move issue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* History popup */}
      {historyBugId ? (() => {
        const bug = bugs.find((b) => b.id === historyBugId);
        if (!bug) return null;
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Status history for ${bug.title}`}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setHistoryBugId(null)}
            />
            <div className="panel relative flex w-full max-w-lg flex-col rounded-2xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{bug.title}</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {bug.statusLog.length} status {bug.statusLog.length === 1 ? "change" : "changes"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryBugId(null)}
                  className="control-chip shrink-0 p-1.5"
                  aria-label="Close history"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              {/* Timeline */}
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
                {bug.statusLog.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">No history yet.</p>
                ) : (
                  <ol className="relative space-y-0 border-l border-[var(--line)] pl-5">
                    {[...bug.statusLog].reverse().map((entry, idx) => (
                      <li key={idx} className="relative pb-6 last:pb-0">
                        {/* Timeline dot */}
                        <span className="absolute -left-[1.175rem] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                        </span>

                        {/* Transition row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-block rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--muted)]">
                            {entry.fromStatus}
                          </span>
                          <span className="text-[10px] text-[var(--muted)]">→</span>
                          <span className="inline-block rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--accent)]">
                            {entry.toStatus}
                          </span>
                          {entry.timestamp && (
                            <span className="ml-auto text-[10px] text-[var(--muted)]">
                              {formatDateTime(entry.timestamp)}
                            </span>
                          )}
                        </div>

                        {/* Comment */}
                        {entry.comment ? (
                          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                            <MessageSquarePlus className="mt-0.5 h-3 w-3 shrink-0 text-[var(--muted)]" />
                            <p className="text-xs leading-relaxed text-[var(--foreground)]">{entry.comment}</p>
                          </div>
                        ) : (
                          <p className="mt-1 text-[10px] italic text-[var(--muted)]">No note added.</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        );
      })() : null}
    </>
  );
}
