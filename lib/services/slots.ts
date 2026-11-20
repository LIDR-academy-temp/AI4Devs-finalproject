export interface TimeRange {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface BookedRange {
  startAt: Date;
  endAt: Date;
}

export interface ComputeAvailableSlotsParams {
  /** Calendar day being queried; only the date part is used (time-of-day is ignored). */
  date: Date;
  /** Availability blocks configured for that day of week. */
  availability: TimeRange[];
  durationMinutes: number;
  /** Appointments already booked that day for the same business (cancelled ones excluded by the caller). */
  existingAppointments: BookedRange[];
  /** Granularity between candidate slot starts; defaults to durationMinutes. */
  slotStepMinutes?: number;
  /** Used to exclude slots that already started when `date` is today. */
  now?: Date;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function minutesToDateOnDay(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setMinutes(minutes);
  return result;
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function computeAvailableSlots(params: ComputeAvailableSlotsParams): string[] {
  const { date, availability, durationMinutes, existingAppointments, slotStepMinutes, now } = params;
  if (durationMinutes <= 0) return [];

  const step = slotStepMinutes && slotStepMinutes > 0 ? slotStepMinutes : durationMinutes;
  const slots = new Set<string>();

  for (const block of availability) {
    const blockStart = parseTimeToMinutes(block.startTime);
    const blockEnd = parseTimeToMinutes(block.endTime);
    if (blockEnd <= blockStart) continue;

    for (let candidate = blockStart; candidate + durationMinutes <= blockEnd; candidate += step) {
      const candidateStart = minutesToDateOnDay(date, candidate);
      const candidateEnd = minutesToDateOnDay(date, candidate + durationMinutes);

      if (now && candidateStart.getTime() < now.getTime()) continue;

      const overlaps = existingAppointments.some((appt) =>
        rangesOverlap(candidateStart, candidateEnd, appt.startAt, appt.endAt)
      );
      if (overlaps) continue;

      slots.add(formatMinutes(candidate));
    }
  }

  return Array.from(slots).sort();
}
