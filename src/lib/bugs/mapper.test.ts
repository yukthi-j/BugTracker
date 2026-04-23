import { mapSnapshotToBug } from "@/lib/bugs/mapper";

function createSnapshotMock(overrides?: Record<string, unknown>, hasPendingWrites = false) {
  return {
    id: "bug-1",
    metadata: {
      hasPendingWrites,
    },
    data: () => ({
      title: "Broken login",
      description: "The login CTA does nothing",
      status: "new",
      priority: "high",
      tags: ["auth", 123, "ui"],
      createdAt: {
        toDate: () => new Date("2026-04-10T10:00:00Z"),
      },
      updatedAt: {
        toDate: () => new Date("2026-04-10T11:00:00Z"),
      },
      ...overrides,
    }),
  };
}

describe("mapSnapshotToBug", () => {
  it("normalizes firestore data into the bug domain shape", () => {
    const bug = mapSnapshotToBug(createSnapshotMock() as never);

    expect(bug).toMatchObject({
      id: "bug-1",
      title: "Broken login",
      description: "The login CTA does nothing",
      status: "new",
      priority: "high",
      tags: ["auth", "ui"],
      hasPendingServerTimestamps: false,
    });
    expect(bug.createdAt).toEqual(new Date("2026-04-10T10:00:00Z"));
    expect(bug.updatedAt).toEqual(new Date("2026-04-10T11:00:00Z"));
  });

  it("falls back safely for malformed or pending values", () => {
    const bug = mapSnapshotToBug(
      createSnapshotMock(
        {
          title: 123,
          description: null,
          status: "unknown",
          priority: "unknown",
          tags: "not-an-array",
          createdAt: null,
          updatedAt: null,
        },
        true,
      ) as never,
    );

    expect(bug).toMatchObject({
      title: "Untitled bug",
      description: "",
      status: "new",
      priority: "medium",
      tags: [],
      createdAt: null,
      updatedAt: null,
      hasPendingServerTimestamps: true,
    });
  });
});
