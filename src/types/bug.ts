export const BUG_STATUSES = [
  "new",
  "in progress",
  "resolved",
  "invalid",
  "closed",
  "reopened",
] as const;

export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export type BugPriority = (typeof BUG_PRIORITIES)[number];

export type StatusLogEntry = {
  fromStatus: BugStatus;
  toStatus: BugStatus;
  comment: string;
  timestamp: Date | null;
};

export type Bug = {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: BugPriority;
  tags: string[];
  statusLog: StatusLogEntry[];
  createdAt: Date | null;
  updatedAt: Date | null;
  hasPendingServerTimestamps: boolean;
};

export type CreateBugInput = {
  title: string;
  description: string;
  priority: BugPriority;
  tags?: string[];
};

export type UpdateBugInput = {
  title?: string;
  description?: string;
  priority?: BugPriority;
  tags?: string[];
};
