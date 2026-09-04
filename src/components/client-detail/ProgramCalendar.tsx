"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  format,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { ProgramDTO, LoadEntryDTO } from "@/lib/types";

// Programs are contiguous by startDate (a new program deactivates the
// previous one) — so "which program applied on date X" is just the last
// program whose startDate is on or before X, regardless of isActive.
function findProgramForDate(programs: ProgramDTO[], date: Date): ProgramDTO | null {
  const sorted = [...programs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  let applicable: ProgramDTO | null = null;
  for (const p of sorted) {
    if (new Date(p.startDate) <= date) applicable = p;
    else break;
  }
  return applicable;
}

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function ProgramCalendar({
  programs,
  loadEntries,
}: {
  programs: ProgramDTO[];
  loadEntries: LoadEntryDTO[];
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  // Defaults to today so the detail panel is visible right away, not only
  // after the trainer/klien clicks a date.
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  // Collapsed by default — the grid + detail panel take a lot of vertical
  // space, so only show them once someone actually wants the calendar.
  const [expanded, setExpanded] = useState(false);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, LoadEntryDTO[]>();
    for (const l of loadEntries) {
      const key = l.recordedDate.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    return map;
  }, [loadEntries]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedProgram = selectedDate ? findProgramForDate(programs, selectedDate) : null;
  const selectedEntries = selectedKey ? entriesByDate.get(selectedKey) ?? [] : [];

  if (programs.length === 0) {
    return null;
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <p className="label">Kalender program</p>
        <span className="text-sm text-[var(--accent)] font-medium">
          {expanded ? "Sembunyikan ▲" : "Lihat kalender ▾"}
        </span>
      </button>

      {expanded && (
        <>
          <div className="flex items-center justify-between">
            <span />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary text-sm px-2 py-1"
                onClick={() => setMonth((m) => subMonths(m, 1))}
              >
                &lsaquo;
              </button>
              <span className="text-sm font-medium min-w-[9rem] text-center">
                {format(month, "MMMM yyyy", { locale: idLocale })}
              </span>
              <button
                type="button"
                className="btn-secondary text-sm px-2 py-1"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                &rsaquo;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted)]">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const hasEntries = entriesByDate.has(key);
              const inMonth = isSameMonth(day, month);
              const program = findProgramForDate(programs, day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-md border text-xs flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--surface-2)]"
                      : "border-[var(--border)]"
                  } ${inMonth ? "" : "opacity-35"}`}
                >
                  <span>{format(day, "d")}</span>
                  {hasEntries && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                  {!hasEntries && program && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-[var(--muted)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1" />
            ada latihan tercatat &nbsp;
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--border)] mr-1" />
            ada program berjalan (belum ada catatan)
          </p>

          {selectedDate && (
            <div className="rounded-lg border border-[var(--border)] p-3 text-sm">
              <p className="font-medium">
                {format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
              </p>
              <p className="text-[var(--muted)] mb-2">
                Program berlaku: {selectedProgram ? selectedProgram.name : "Belum ada program"}
              </p>
              {selectedEntries.length > 0 ? (
                <ul className="flex flex-col gap-0.5">
                  {selectedEntries.map((e) => (
                    <li key={e.id}>
                      {e.exerciseName}: {e.weight}kg x {e.reps} (set {e.setNumber}) — est. 1RM {e.estimated1RM}kg
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--muted)]">Tidak ada latihan tercatat di tanggal ini.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
