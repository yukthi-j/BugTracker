import { filterBugsByQueryAndStatus, matchesSearchQuery } from "@/lib/bugs/filter";
import type { Bug } from "@/types/bug";

const bugs: Bug[] = [
  {
    id: "1",
    title: "Login button stuck",
    description: "Chrome only",
    status: "new",
    priority: "high",
    tags: [],
    statusLog: [],
    createdAt: new Date("2026-04-10T10:00:00Z"),
    updatedAt: new Date("2026-04-10T10:00:00Z"),
    hasPendingServerTimestamps: false,
  },
  {
    id: "2",
    title: "Graph flicker",
    description: "Dashboard animation regression",
    status: "resolved",
    priority: "medium",
    tags: [],
    statusLog: [],
    createdAt: new Date("2026-04-10T11:00:00Z"),
    updatedAt: new Date("2026-04-10T11:00:00Z"),
    hasPendingServerTimestamps: false,
  },
];

describe("bug filtering", () => {
  it("matches search query against title and description", () => {
    expect(matchesSearchQuery(bugs[0], "chrome")).toBe(true);
    expect(matchesSearchQuery(bugs[1], "login")).toBe(false);
  });

  it("filters by query and active statuses", () => {
    expect(filterBugsByQueryAndStatus(bugs, "dash", ["resolved"]).map((bug) => bug.id)).toEqual(["2"]);
  });
});
