import type { BugStatus } from "@/types/bug";

export const ALLOWED_STATUS_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  new: ["in progress", "invalid", "closed"],
  "in progress": ["resolved", "invalid", "closed"],
  resolved: ["reopened", "closed"],
  invalid: ["reopened", "closed"],
  closed: ["reopened"],
  reopened: ["in progress", "invalid", "closed"],
};

export function getAllowedTransitions(status: BugStatus): BugStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[status];
}

export function canTransitionStatus(currentStatus: BugStatus, nextStatus: BugStatus): boolean {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}
