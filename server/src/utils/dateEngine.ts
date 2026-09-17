export class DateEngine {
  /**
   * Get the current date in the specified timezone in YYYY-MM-DD format.
   */
  static getCurrentDateInTimezone(now: Date, timezone: string): string {
    // 'en-CA' forces YYYY-MM-DD format
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now);
  }

  /**
   * Calculate the number of calendar days elapsed between two YYYY-MM-DD strings.
   */
  static getDaysElapsed(startDate: string, currentDate: string): number {
    const start = new Date(`${startDate}T00:00:00Z`);
    const current = new Date(`${currentDate}T00:00:00Z`);
    const diffMs = current.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Determines the current week and day of the program.
   * Returns null if the program hasn't started yet.
   */
  static getProgramPosition(
    now: Date,
    startDate: string,
    timezone: string
  ): {
    daysElapsed: number;
    week: number;
    day: number;
    hasStarted: boolean;
  } {
    const currentDate = this.getCurrentDateInTimezone(now, timezone);
    const daysElapsed = this.getDaysElapsed(startDate, currentDate);

    if (daysElapsed < 0) {
      return { daysElapsed, week: -1, day: -1, hasStarted: false };
    }

    const week = Math.floor(daysElapsed / 7);
    const day = daysElapsed % 7;

    return { daysElapsed, week, day, hasStarted: true };
  }
}
