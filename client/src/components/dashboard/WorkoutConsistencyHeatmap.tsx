import React, { useState, useMemo, useRef, useEffect } from "react";
import { Calendar, AlertTriangle, Sparkles, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkoutActivity } from "../../hooks/useWorkoutActivity";

const LEVEL_COLORS: Record<number, string> = {
  0: "#E5E7EB", // No workout
  1: "#DBEAFE", // Level 1 (1 workout)
  2: "#93C5FD", // Level 2 (2 workouts)
  3: "#3B82F6", // Level 3 (3 workouts)
  4: "#1D4ED8", // Level 4 (4+ workouts)
};

function getActivityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

function getWorkoutMessage(count: number): string {
  if (count === 0) return "No workouts";
  if (count === 1) return "1 workout completed";
  return `${count} workouts completed`;
}

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

interface HeatmapDay {
  date: string; // YYYY-MM-DD
  dateObj: Date;
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
  isToday: boolean;
}

interface MonthLabel {
  col: number;
  label: string;
}

export default function WorkoutConsistencyHeatmap() {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);

  // Timezone resolution
  const userTimezone = useMemo(() => {
    return (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC") || "UTC";
  }, []);

  // Compute 53 rolling weeks ending on the current week
  const { weeks, monthLabels, startDateStr, endDateStr } = useMemo(() => {
    const now = new Date();
    // Calculate today's date strictly in the user's timezone (YYYY-MM-DD)
    const tStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: userTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const [tY, tM, tD] = tStr.split("-").map(Number);
    const todayDateObj = new Date(tY, tM - 1, tD);

    // Monday-based day of week (0 = Monday, 6 = Sunday)
    const dayOfWeek = (todayDateObj.getDay() + 6) % 7;

    // Current week Monday
    const currentMonday = new Date(tY, tM - 1, tD - dayOfWeek);
    currentMonday.setHours(0, 0, 0, 0);

    // 52 weeks prior (53 weeks total, index 0 to 52)
    const startMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 52 * 7);
    startMonday.setHours(0, 0, 0, 0);

    const sStr = `${startMonday.getFullYear()}-${String(startMonday.getMonth() + 1).padStart(2, "0")}-${String(startMonday.getDate()).padStart(2, "0")}`;

    const computedWeeks: { weekIndex: number; days: { date: string; dateObj: Date; dayOfWeek: number; isFuture: boolean; isToday: boolean }[] }[] = [];
    const computedMonthLabels: MonthLabel[] = [];
    let lastMonth = -1;
    let lastCol = -99;

    for (let w = 0; w < 53; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const dObj = new Date(startMonday.getFullYear(), startMonday.getMonth(), startMonday.getDate() + w * 7 + d);
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, "0");
        const dt = String(dObj.getDate()).padStart(2, "0");
        const dStr = `${y}-${m}-${dt}`;
        const isFuture = dStr > tStr;
        const isToday = dStr === tStr;

        days.push({
          date: dStr,
          dateObj: dObj,
          dayOfWeek: d,
          isFuture,
          isToday,
        });
      }

      // Check month label (using the Monday of each week)
      const weekMonday = days[0].dateObj;
      const m = weekMonday.getMonth();
      if (m !== lastMonth && w - lastCol >= 3) {
        computedMonthLabels.push({
          col: w,
          label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(weekMonday),
        });
        lastMonth = m;
        lastCol = w;
      }

      computedWeeks.push({ weekIndex: w, days });
    }

    return {
      weeks: computedWeeks,
      monthLabels: computedMonthLabels,
      startDateStr: sStr,
      endDateStr: tStr,
    };
  }, [userTimezone]);

  // Fetch activity with React Query
  const { data: activityData, isLoading, isError, refetch } = useWorkoutActivity({
    startDate: startDateStr,
    endDate: endDateStr,
    timezone: userTimezone,
  });

  // Map API activity days for fast O(1) lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (activityData?.days) {
      for (const item of activityData.days) {
        map.set(item.date, item.count);
      }
    }
    return map;
  }, [activityData]);

  // Aggregate stats
  const totalWorkouts = activityData?.totalWorkouts ?? 0;
  const totalWorkoutDays = activityData?.totalWorkoutDays ?? 0;

  // Hydrate full heatmap weeks with counts and levels
  const hydratedWeeks = useMemo(() => {
    return weeks.map((week) => ({
      ...week,
      days: week.days.map((day): HeatmapDay => {
        const count = day.isFuture ? 0 : (activityMap.get(day.date) || 0);
        const level = day.isFuture ? 0 : getActivityLevel(count);
        return {
          ...day,
          count,
          level,
        };
      }),
    }));
  }, [weeks, activityMap]);

  // Auto-scroll to right (latest week) once on mount / initial layout on mobile/tablet
  useEffect(() => {
    if (!hasAutoScrolledRef.current && scrollContainerRef.current) {
      if (scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        hasAutoScrolledRef.current = true;
      }
    }
  }, [hydratedWeeks]);

  const handleCellHover = (day: HeatmapDay, event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>) => {
    if (day.isFuture) return;
    const cell = event.currentTarget;
    if (gridContainerRef.current) {
      const containerRect = gridContainerRef.current.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      setTooltipPos({
        x: cellRect.left - containerRect.left + cellRect.width / 2,
        y: cellRect.top - containerRect.top,
      });
    }
    setHoveredDay(day);
  };

  const handleCellLeave = () => {
    setHoveredDay(null);
    setTooltipPos(null);
  };

  const handleCellClick = (day: HeatmapDay) => {
    if (day.isFuture) return;
    setSelectedDay((prev) => (prev?.date === day.date ? null : day));
  };

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="h-5 w-44 bg-[#E5E7EB] rounded-md mb-2"></div>
            <div className="h-3 w-64 bg-[#E5E7EB] rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-[#E5E7EB] rounded-lg"></div>
            <div className="h-10 w-20 bg-[#E5E7EB] rounded-lg"></div>
          </div>
        </div>
        <div className="h-28 w-full bg-[#F1F3F5] rounded-xl mb-3"></div>
        <div className="flex justify-between items-center pt-3 border-t border-[#E5E7EB]">
          <div className="h-3 w-40 bg-[#E5E7EB] rounded"></div>
          <div className="h-3 w-28 bg-[#E5E7EB] rounded"></div>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <h3 className="text-base font-bold text-[#111827]">Unable to load workout activity</h3>
        <p className="text-xs text-[#6B7280] mt-1 mb-4">
          There was a problem retrieving your activity calendar.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center justify-center rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] px-4 py-2 text-xs font-bold text-[#111827] hover:bg-[#F1F3F5] transition shadow-sm min-h-[38px]"
        >
          Try Again
        </button>
      </div>
    );
  }

  const activeDay = selectedDay || hoveredDay;

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <Calendar className="text-cyan-600" size={18} />
            Workout Consistency
          </h2>
          <p className="text-xs text-[#6B7280] font-medium mt-0.5">
            {totalWorkouts === 0
              ? "365 days of activity • Complete workouts to build consistency"
              : `${totalWorkouts} completed workout${totalWorkouts === 1 ? "" : "s"} across ${totalWorkoutDays} day${totalWorkoutDays === 1 ? "" : "s"} in the last 12 months`}
          </p>
        </div>

        {/* Stat badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 text-center min-w-[76px]">
            <span className="block text-base font-bold text-[#111827] leading-none">
              {totalWorkouts}
            </span>
            <span className="text-[10px] uppercase font-bold text-[#6B7280]">Workouts</span>
          </div>
          <div className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-3.5 py-1.5 text-center min-w-[76px]">
            <span className="block text-base font-bold text-[#111827] leading-none">
              {totalWorkoutDays}
            </span>
            <span className="text-[10px] uppercase font-bold text-[#6B7280]">Active Days</span>
          </div>
        </div>
      </div>

      {/* Heatmap Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200"
      >
        <div ref={gridContainerRef} className="relative min-w-fit pr-2">
          {/* Floating Tooltip (Desktop Hover & Active Cell) */}
          {hoveredDay && tooltipPos && (
            <div
              className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-2"
              style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
            >
              <div className="bg-[#111827] text-white rounded-lg px-2.5 py-1.5 shadow-xl text-center whitespace-nowrap border border-gray-700">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold leading-tight">
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: LEVEL_COLORS[hoveredDay.level] }}
                  />
                  <span>{getWorkoutMessage(hoveredDay.count)}</span>
                </div>
                <div className="text-[10px] text-gray-300 font-medium mt-0.5">
                  {formatFullDate(hoveredDay.dateObj)}
                </div>
              </div>
              {/* Tooltip arrow */}
              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#111827] mx-auto" />
            </div>
          )}

          {/* Month Label Row */}
          <div className="flex pl-8 mb-1.5 relative h-4 text-[10px] font-semibold text-[#6B7280]">
            {monthLabels.map((m) => (
              <span
                key={m.col}
                className="absolute"
                style={{ left: `calc(2rem + ${m.col} * 15px)` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid: Weekday Column (left) + 53 Week Columns */}
          <div className="flex gap-[3px] items-start">
            {/* Weekday Labels (Mon, Wed, Fri to preserve vertical space) */}
            <div className="flex flex-col gap-[3px] w-7 pr-1 text-[9px] font-bold text-[#9CA3AF] select-none text-right shrink-0">
              <span className="h-3 flex items-center justify-end leading-none">Mon</span>
              <span className="h-3 leading-none" aria-hidden="true" />
              <span className="h-3 flex items-center justify-end leading-none">Wed</span>
              <span className="h-3 leading-none" aria-hidden="true" />
              <span className="h-3 flex items-center justify-end leading-none">Fri</span>
              <span className="h-3 leading-none" aria-hidden="true" />
              <span className="h-3 leading-none" aria-hidden="true" />
            </div>

            {/* Weeks */}
            {hydratedWeeks.map((week) => (
              <div key={week.weekIndex} className="flex flex-col gap-[3px] shrink-0">
                {week.days.map((day) => {
                  const isSelected = selectedDay?.date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={day.isFuture}
                      onClick={() => handleCellClick(day)}
                      onMouseEnter={(e) => handleCellHover(day, e)}
                      onMouseLeave={handleCellLeave}
                      onFocus={(e) => handleCellHover(day, e)}
                      onBlur={handleCellLeave}
                      aria-label={`${formatFullDate(day.dateObj)}: ${getWorkoutMessage(day.count)}`}
                      className={`w-3 h-3 rounded-[2px] transition-all relative ${
                        day.isFuture
                          ? "opacity-0 pointer-events-none"
                          : "cursor-pointer hover:scale-125 hover:z-20 focus:scale-125 focus:z-20 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      } ${isSelected ? "ring-2 ring-cyan-600 scale-125 z-20" : ""} ${
                        day.isToday ? "border border-cyan-500" : ""
                      }`}
                      style={{
                        backgroundColor: day.isFuture ? "transparent" : LEVEL_COLORS[day.level],
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Day Info Card (Mobile & Click UX) */}
      {activeDay && (
        <div className="mt-4 flex items-center justify-between text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 transition-all">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-[2px] shrink-0"
              style={{ backgroundColor: LEVEL_COLORS[activeDay.level] }}
            />
            <span className="font-bold text-[#111827]">
              {formatFullDate(activeDay.dateObj)}
            </span>
          </div>
          <span className="font-semibold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-100">
            {getWorkoutMessage(activeDay.count)}
          </span>
        </div>
      )}

      {/* Empty State Banner (if 0 workouts) */}
      {totalWorkouts === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F7F8FA] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <Sparkles className="text-cyan-600 shrink-0" size={18} />
            <p className="text-xs font-medium text-[#6B7280]">
              No workouts logged in this period. Complete a session to start your streak!
            </p>
          </div>
          <Link
            to="/workouts"
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 transition shrink-0"
          >
            Start Workout
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Footer: Legend & Encouragement */}
      <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
          <TrendingUp size={13} className="text-cyan-600" />
          <span>
            {totalWorkouts >= 50
              ? "Incredible dedication — consistency is compounding!"
              : totalWorkouts > 0
              ? "Every session counts. Keep showing up!"
              : "Consistency turns effort into routine."}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-bold text-[#6B7280]">Less</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className="w-2.5 h-2.5 rounded-[2px]"
                style={{ backgroundColor: LEVEL_COLORS[level] }}
                title={
                  level === 0
                    ? "0 workouts"
                    : level === 4
                    ? "4+ workouts"
                    : `${level} workout${level > 1 ? "s" : ""}`
                }
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-[#6B7280]">More</span>
        </div>
      </div>
    </section>
  );
}
