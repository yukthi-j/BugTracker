import { canTransitionStatus, getAllowedTransitions } from "@/lib/bugs/transitions";

describe("bug transitions", () => {
  it("returns the allowed transitions for a status", () => {
    expect(getAllowedTransitions("resolved")).toEqual(["reopened", "closed"]);
  });

  it("accepts valid transitions and rejects invalid ones", () => {
    expect(canTransitionStatus("new", "in progress")).toBe(true);
    expect(canTransitionStatus("closed", "resolved")).toBe(false);
  });
});
