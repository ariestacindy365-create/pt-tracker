"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MovementDTO } from "@/lib/types";

const ALL = "Semua";

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b)
  );
}

type Props = {
  movements: MovementDTO[];
  value: string;
  onChange: (name: string) => void;
  onMovementCreated: (movement: MovementDTO) => void;
  onPickHints?: (hints: { repRangeHint: string | null; setRangeHint: string | null }) => void;
  placeholder?: string;
};

// Cari gerakan dari kamus bersama (dibawa dari olympus-gym-tracker) untuk
// bantu isi nama gerakan saat susun program. Tetap boleh ketik bebas —
// exerciseName di ProgramExercise cuma teks, bukan terikat ke kamus ini.
export function MovementCombobox({
  movements,
  value,
  onChange,
  onMovementCreated,
  onPickHints,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  // Flip the dropdown above the input when there isn't enough room below —
  // otherwise, on a field near the bottom of the form, the panel can cover
  // the Save button and swallow the click that was meant for it.
  const [dropUp, setDropUp] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [muscleFilter, setMuscleFilter] = useState(ALL);
  const [adding, setAdding] = useState(false);
  const [newMuscle, setNewMuscle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newEquipment, setNewEquipment] = useState("");
  const [newRepRange, setNewRepRange] = useState("");
  const [newSetRange, setNewSetRange] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => uniqueSorted(movements.map((m) => m.category)), [movements]);
  const muscles = useMemo(() => uniqueSorted(movements.map((m) => m.primaryMuscle)), [movements]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    return movements
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .filter((m) => categoryFilter === ALL || m.category === categoryFilter)
      .filter((m) => muscleFilter === ALL || m.primaryMuscle === muscleFilter)
      .slice(0, 30);
  }, [movements, value, categoryFilter, muscleFilter]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function openDropdown() {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      const panelHeight = 320; // matches max-h-80
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDropUp(spaceBelow < panelHeight && spaceAbove > spaceBelow);
    }
    setOpen(true);
  }

  function pick(m: MovementDTO) {
    onChange(m.name);
    onPickHints?.({ repRangeHint: m.repRangeHint, setRangeHint: m.setRangeHint });
    setOpen(false);
  }

  function startAdding() {
    setNewMuscle("");
    setNewCategory("");
    setNewEquipment("");
    setNewRepRange("");
    setNewSetRange("");
    setCreateError(null);
    setAdding(true);
  }

  async function handleCreate() {
    setCreateError(null);
    if (value.trim().length < 2 || !newMuscle.trim() || !newCategory.trim() || !newEquipment.trim()) {
      setCreateError("Isi nama, otot primer, kategori, dan alat.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value.trim(),
          primaryMuscle: newMuscle.trim(),
          category: newCategory.trim(),
          equipment: newEquipment.trim(),
          repRangeHint: newRepRange.trim() || undefined,
          setRangeHint: newSetRange.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Gagal menambah gerakan");
        return;
      }
      onMovementCreated(data.movement);
      onPickHints?.({ repRangeHint: data.movement.repRangeHint, setRangeHint: data.movement.setRangeHint });
      setAdding(false);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        className="input"
        placeholder={placeholder ?? "Cari/ketik gerakan..."}
        value={value}
        onFocus={openDropdown}
        onChange={(e) => {
          onChange(e.target.value);
          openDropdown();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setAdding(false);
          }
        }}
      />

      {open && (
        <div
          className={`absolute z-20 flex max-h-80 w-80 flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {adding ? (
            <div className="flex flex-col gap-2 overflow-y-auto p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Tambah &quot;{value}&quot; ke kamus</p>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Batal
                </button>
              </div>
              <input
                type="text"
                placeholder="Otot primer (mis. Dada)"
                value={newMuscle}
                onChange={(e) => setNewMuscle(e.target.value)}
                className="input text-sm"
              />
              <input
                type="text"
                placeholder="Kategori (mis. Upper Push)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="input text-sm"
              />
              <input
                type="text"
                placeholder="Alat (mis. Barbell)"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                className="input text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Rep hint (mis. 8-10)"
                  value={newRepRange}
                  onChange={(e) => setNewRepRange(e.target.value)}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Set hint (mis. 3)"
                  value={newSetRange}
                  onChange={(e) => setNewSetRange(e.target.value)}
                  className="input text-sm"
                />
              </div>
              {createError && <p className="text-xs text-[var(--danger)]">{createError}</p>}
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary text-xs py-1.5"
              >
                {creating ? "Menyimpan..." : "Simpan ke kamus"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-1 border-b border-[var(--border)] p-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input text-xs py-1"
                  aria-label="Filter kategori"
                >
                  <option value={ALL}>Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={muscleFilter}
                  onChange={(e) => setMuscleFilter(e.target.value)}
                  className="input text-xs py-1"
                  aria-label="Filter otot primer"
                >
                  <option value={ALL}>Semua Otot</option>
                  {muscles.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-[var(--muted)]">Tidak ditemukan.</p>
                ) : (
                  filtered.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => pick(m)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                    >
                      <span>{m.name}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {[m.category, m.primaryMuscle, m.equipment].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {value.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={startAdding}
                  className="border-t border-[var(--border)] px-3 py-2 text-left text-xs font-semibold text-[var(--accent)] hover:bg-[var(--surface-2)]"
                >
                  + Simpan &quot;{value.trim()}&quot; ke kamus
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
