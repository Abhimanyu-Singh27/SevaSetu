const hourMs = 60 * 60 * 1000;
const visibleHours = 12;

export type AvailabilityInterval = { startedAt: Date; endedAt: Date | null };
export type EarningRecord = { amount: number; createdAt: Date };
export type EarningsBucket = { label: string; amount: number };

export function buildActiveHourEarnings(
  sessions: AvailabilityInterval[],
  records: EarningRecord[],
  currentlyActive: boolean,
  now = new Date(),
) {
  let activeMilliseconds = 0;
  const intervals = sessions
    .map((session) => {
      const start = session.startedAt.getTime();
      const end = session.endedAt?.getTime() ?? (currentlyActive ? now.getTime() : start);
      if (end <= start) return null;
      const interval = { start, end, activeStart: activeMilliseconds };
      activeMilliseconds += end - start;
      return interval;
    })
    .filter((interval): interval is NonNullable<typeof interval> => interval !== null);

  const bucketCount = activeMilliseconds === 0 ? visibleHours : Math.min(visibleHours, Math.max(1, Math.ceil(activeMilliseconds / hourMs)));
  const windowStart = Math.max(0, activeMilliseconds - bucketCount * hourMs);
  const amounts = Array.from({ length: bucketCount }, () => 0);

  for (const record of records) {
    const timestamp = record.createdAt.getTime();
    const interval = intervals.find((candidate) => timestamp >= candidate.start && timestamp <= candidate.end);
    if (!interval) continue;
    const activeAt = interval.activeStart + Math.min(timestamp - interval.start, interval.end - interval.start);
    if (activeAt < windowStart || activeAt > activeMilliseconds) continue;
    const bucketIndex = Math.min(bucketCount - 1, Math.floor((activeAt - windowStart) / hourMs));
    amounts[bucketIndex] += record.amount;
  }

  return {
    buckets: amounts.map((amount, index) => ({ label: `${index + 1}h`, amount })),
    active: currentlyActive,
    total: amounts.reduce((sum, amount) => sum + amount, 0),
    hasEarnings: amounts.some((amount) => amount > 0),
  };
}