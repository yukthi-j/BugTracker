import type { DocumentSnapshot, Timestamp } from "firebase/firestore";

import { BUG_PRIORITIES, BUG_STATUSES, type Bug, type BugPriority, type BugStatus, type StatusLogEntry } from "@/types/bug";

type FirestoreBugDoc = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  tags?: unknown;
  statusLog?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function isBugStatus(value: unknown): value is BugStatus {
  return typeof value === "string" && BUG_STATUSES.includes(value as BugStatus);
}

function isBugPriority(value: unknown): value is BugPriority {
  return typeof value === "string" && BUG_PRIORITIES.includes(value as BugPriority);
}

function asDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate();
  }

  return null;
}

function mapStatusLogEntry(entry: unknown): StatusLogEntry | null {
  if (typeof entry !== "object" || entry === null) return null;
  const e = entry as Record<string, unknown>;
  if (!isBugStatus(e.fromStatus) || !isBugStatus(e.toStatus)) return null;
  return {
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    comment: typeof e.comment === "string" ? e.comment : "",
    timestamp: asDate(e.timestamp),
  };
}

export function mapSnapshotToBug(snapshot: DocumentSnapshot): Bug {
  const data = snapshot.data({ serverTimestamps: "estimate" }) as FirestoreBugDoc | undefined;

  if (!data) {
    throw new Error(`Bug document ${snapshot.id} is missing.`);
  }

  return {
    id: snapshot.id,
    title: typeof data.title === "string" ? data.title : "Untitled bug",
    description: typeof data.description === "string" ? data.description : "",
    status: isBugStatus(data.status) ? data.status : "new",
    priority: isBugPriority(data.priority) ? data.priority : "medium",
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
    statusLog: Array.isArray(data.statusLog)
      ? data.statusLog.map(mapStatusLogEntry).filter((e): e is StatusLogEntry => e !== null)
      : [],
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    hasPendingServerTimestamps: snapshot.metadata.hasPendingWrites,
  };
}
