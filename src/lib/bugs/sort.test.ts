import { sortBugsByOption, sortBugsDeterministic } from "@/lib/bugs/sort";
import type { Bug } from "@/types/bug";

const bugs: Bug[] = [
  {
    id: "bug-c",
    title: "Gamma",
    description: "Third",
    status: "new",
    priority: "low",
    tags: [],
    statusLog: [],
    createdAt: new Date("2026-04-10T12:00:00Z"),
    updatedAt: new Date("2026-04-10T16:00:00Z"),
    hasPendingServerTimestamps: false,
  },
  {
    id: "bug-a",
    title: "Alpha",
    description: "First",
    status: "new",
    priority: "critical",
    tags: [],
    statusLog: [],
    createdAt: new Date("2026-04-10T14:00:00Z"),
    updatedAt: new Date("2026-04-10T16:00:00Z"),
    hasPendingServerTimestamps: false,
  },
  {
    id: "bug-b",
    title: "Beta",
    description: "Second",
    status: "in progress",
    priority: "medium",
    tags: [],
    statusLog: [],
    createdAt: new Date("2026-04-10T15:00:00Z"),
    updatedAt: new Date("2026-04-10T15:30:00Z"),
    hasPendingServerTimestamps: false,
  },
];

describe("bug sorting", () => {
  it("applies deterministic ordering by updatedAt, createdAt, then id", () => {
    expect(sortBugsDeterministic(bugs).map((bug) => bug.id)).toEqual(["bug-a", "bug-c", "bug-b"]);
  });

  it("sorts by priority while preserving deterministic fallback ordering", () => {
    expect(sortBugsByOption(bugs, "priority").map((bug) => bug.id)).toEqual(["bug-a", "bug-b", "bug-c"]);
  });

  it("sorts by createdAt descending when requested", () => {
    expect(sortBugsByOption(bugs, "createdAt").map((bug) => bug.id)).toEqual(["bug-b", "bug-a", "bug-c"]);
  });
});
