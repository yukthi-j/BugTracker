import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { BugBoard } from "@/components/bug-board";
import type { Bug } from "@/types/bug";

const repository = vi.hoisted(() => ({
  listBugs: vi.fn(),
  createBug: vi.fn(),
  updateBug: vi.fn(),
  transitionStatus: vi.fn(),
  deleteBug: vi.fn(),
}));

vi.mock("@/lib/bugs/repository", () => repository);

const createdBug: Bug = {
  id: "bug-1",
  title: "Login broken",
  description: "CTA is inert",
  status: "new",
  priority: "medium",
  tags: [],
  statusLog: [],
  createdAt: new Date("2026-04-10T10:00:00Z"),
  updatedAt: new Date("2026-04-10T10:00:00Z"),
  hasPendingServerTimestamps: false,
};

const movedBug: Bug = {
  ...createdBug,
  status: "in progress",
  updatedAt: new Date("2026-04-10T11:00:00Z"),
};

describe("BugBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listBugs.mockResolvedValue([]);
    repository.createBug.mockResolvedValue(createdBug);
    repository.updateBug.mockResolvedValue(createdBug);
    repository.transitionStatus.mockResolvedValue(movedBug);
    repository.deleteBug.mockResolvedValue(undefined);
  });

  it("creates a bug and moves it to in progress", async () => {
    const user = userEvent.setup();
    render(<BugBoard />);

    await waitFor(() => {
      expect(repository.listBugs).toHaveBeenCalled();
    });

    await user.type(screen.getByPlaceholderText("New issue title\u2026"), "Login broken");
    await user.type(screen.getByPlaceholderText("Description (optional)"), "CTA is inert");
    await user.click(screen.getByRole("button", { name: /add issue/i }));

    await screen.findByText("Login broken");
    expect(repository.createBug).toHaveBeenCalledWith({
      title: "Login broken",
      description: "CTA is inert",
      priority: "medium",
    });

    const newColumn = screen.getByRole("heading", { name: "new" }).closest("article");
    expect(newColumn).not.toBeNull();
    expect(within(newColumn as HTMLElement).getByText("Login broken")).toBeInTheDocument();

    await user.click(within(newColumn as HTMLElement).getByRole("button", { name: /in progress/i }));

    // Comment modal appears — confirm without a note
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /move issue/i }));

    await waitFor(() => {
      expect(repository.transitionStatus).toHaveBeenCalledWith("bug-1", "in progress", "");
    });

    const inProgressColumn = screen.getByRole("heading", { name: "in progress" }).closest("article");
    expect(inProgressColumn).not.toBeNull();
    await waitFor(() => {
      expect(within(inProgressColumn as HTMLElement).getByText("Login broken")).toBeInTheDocument();
    });
  });
});
