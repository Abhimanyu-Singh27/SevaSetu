import { describe, expect, it } from "vitest";
import { buildActiveHourEarnings } from "@/lib/worker-earnings";

describe("worker active-hour earnings", () => {
  it("places earnings in cumulative active time while excluding offline gaps", () => {
    const start = new Date("2026-09-26T09:00:00.000Z");
    const returnedOnline = new Date("2026-09-26T12:00:00.000Z");
    const now = new Date("2026-09-26T13:00:00.000Z");
    const result = buildActiveHourEarnings(
      [
        { startedAt: start, endedAt: new Date("2026-09-26T10:00:00.000Z") },
        { startedAt: returnedOnline, endedAt: null },
      ],
      [
        { amount: 100, createdAt: new Date("2026-09-26T09:30:00.000Z") },
        { amount: 250, createdAt: new Date("2026-09-26T12:30:00.000Z") },
      ],
      true,
      now,
    );

    expect(result.buckets).toHaveLength(2);
    expect(result.buckets.map((bucket) => bucket.amount)).toEqual([100, 250]);
    expect(result.total).toBe(350);
    expect(result.active).toBe(true);
  });

  it("keeps an offline worker's series frozen with no fake earnings", () => {
    const result = buildActiveHourEarnings(
      [{ startedAt: new Date("2026-09-26T09:00:00.000Z"), endedAt: new Date("2026-09-26T10:00:00.000Z") }],
      [],
      false,
      new Date("2026-09-26T16:00:00.000Z"),
    );

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].amount).toBe(0);
    expect(result.total).toBe(0);
    expect(result.hasEarnings).toBe(false);
    expect(result.active).toBe(false);
  });

  it("starts with a flat zero series when no work has been completed", () => {
    const result = buildActiveHourEarnings([], [], false);

    expect(result.buckets).toHaveLength(12);
    expect(result.buckets.every((bucket) => bucket.amount === 0)).toBe(true);
    expect(result.hasEarnings).toBe(false);
  });
});
