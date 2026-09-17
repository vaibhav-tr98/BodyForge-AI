import { DateEngine } from "./dateEngine";

describe("DateEngine", () => {
  const UTC_MIDNIGHT = new Date("2026-09-16T00:00:00Z");

  describe("getCurrentDateInTimezone", () => {
    it("should return correct local date based on timezone", () => {
      // 2026-09-16T00:00:00Z is 2026-09-15 20:00:00 in America/New_York
      const nyDate = DateEngine.getCurrentDateInTimezone(UTC_MIDNIGHT, "America/New_York");
      expect(nyDate).toBe("2026-09-15");

      // 2026-09-16T00:00:00Z is 2026-09-16 05:30:00 in Asia/Kolkata
      const istDate = DateEngine.getCurrentDateInTimezone(UTC_MIDNIGHT, "Asia/Kolkata");
      expect(istDate).toBe("2026-09-16");
      
      // 2026-09-16T00:00:00Z is 2026-09-16 09:00:00 in Asia/Tokyo
      const tokyoDate = DateEngine.getCurrentDateInTimezone(UTC_MIDNIGHT, "Asia/Tokyo");
      expect(tokyoDate).toBe("2026-09-16");
    });
  });

  describe("getDaysElapsed", () => {
    it("should return correct elapsed days", () => {
      expect(DateEngine.getDaysElapsed("2026-09-01", "2026-09-01")).toBe(0); // Same day
      expect(DateEngine.getDaysElapsed("2026-09-01", "2026-09-02")).toBe(1); // Next day
      expect(DateEngine.getDaysElapsed("2026-09-01", "2026-09-08")).toBe(7); // Next week
      expect(DateEngine.getDaysElapsed("2026-09-02", "2026-09-01")).toBe(-1); // Before start
      expect(DateEngine.getDaysElapsed("2026-08-31", "2026-09-01")).toBe(1); // Month boundary
      expect(DateEngine.getDaysElapsed("2024-02-28", "2024-03-01")).toBe(2); // Leap year
    });
  });

  describe("getProgramPosition", () => {
    it("should return correct program position", () => {
      const now = new Date("2026-09-16T10:00:00Z"); // 10AM UTC -> Same day in IST
      const startDate = "2026-09-15"; // Started yesterday
      
      const position = DateEngine.getProgramPosition(now, startDate, "Asia/Kolkata");
      expect(position.daysElapsed).toBe(1);
      expect(position.week).toBe(0);
      expect(position.day).toBe(1);
      expect(position.hasStarted).toBe(true);
    });

    it("should handle before start correctly", () => {
      const now = new Date("2026-09-16T10:00:00Z"); // 10AM UTC -> Same day in IST (2026-09-16)
      const startDate = "2026-09-20";
      
      const position = DateEngine.getProgramPosition(now, startDate, "Asia/Kolkata");
      expect(position.hasStarted).toBe(false);
      expect(position.daysElapsed).toBe(-4);
      expect(position.week).toBe(-1);
      expect(position.day).toBe(-1);
    });

    it("should calculate correct weeks and days", () => {
      const startDay = new Date("2026-09-01T12:00:00Z");

      // Day 0
      expect(DateEngine.getProgramPosition(startDay, "2026-09-01", "UTC")).toMatchObject({
        week: 0, day: 0, hasStarted: true
      });

      // Day 6
      const day6 = new Date("2026-09-07T12:00:00Z");
      expect(DateEngine.getProgramPosition(day6, "2026-09-01", "UTC")).toMatchObject({
        week: 0, day: 6, hasStarted: true
      });

      // Day 7 (Week 2, Day 0)
      const day7 = new Date("2026-09-08T12:00:00Z");
      expect(DateEngine.getProgramPosition(day7, "2026-09-01", "UTC")).toMatchObject({
        week: 1, day: 0, hasStarted: true
      });
    });
  });
});
