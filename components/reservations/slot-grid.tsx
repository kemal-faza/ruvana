"use client";

import { cn } from "cn";

export type Slot = { startTime: string; endTime: string };

type SlotGridProps = {
  slots: Slot[];
  selected: string[];
  onToggle: (time: string) => void;
  unavailable?: string[];
};

const GROUPS = [
  { key: "pagi", label: "Pagi", rangeLabel: "07:00–11:30", start: "07:00", end: "11:30" },
  { key: "siang", label: "Siang", rangeLabel: "12:00–14:30", start: "12:00", end: "14:30" },
  { key: "sore", label: "Sore", rangeLabel: "15:00–17:30", start: "15:00", end: "17:30" },
  { key: "malam", label: "Malam", rangeLabel: "18:00–20:00", start: "18:00", end: "20:00" },
] as const;

function getSummary(selected: string[], slots: Slot[]) {
  if (selected.length === 0) return null;
  const sorted = [...selected].sort();
  const startTime = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const idx = slots.findIndex((s) => s.startTime === last);
  const endTime = idx >= 0 ? slots[idx].endTime : null;
  if (!endTime) return null;
  // cek berurutan tanpa gap (untuk pesan invalid)
  let valid = true;
  for (let i = 0; i < sorted.length - 1; i++) {
    const aIdx = slots.findIndex((s) => s.startTime === sorted[i]);
    const bIdx = slots.findIndex((s) => s.startTime === sorted[i + 1]);
    if (bIdx !== aIdx + 1) {
      valid = false;
      break;
    }
  }
  return { startTime, endTime, count: selected.length, valid, sorted };
}

export function SlotGrid({ slots, selected, onToggle, unavailable = [] }: SlotGridProps) {
  const unavailableSet = new Set(unavailable);
  const summary = getSummary(selected, slots);

  return (
    <div className="flex flex-col gap-3">
      {/* ringkasan kecil — hanya saat ada slot terpilih */}
      {summary && (
        <p className="text-xs text-muted-foreground">
          Dipilih: {summary.startTime}–{summary.endTime}, {summary.count} slot
          {!summary.valid && <span className="ml-1 text-destructive">— tidak berurutan</span>}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => {
          const groupSlots = slots.filter((s) => s.startTime >= group.start && s.startTime <= group.end);
          if (groupSlots.length === 0) return null;
          return (
            <div key={group.key} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {group.label} <span className="font-normal">{group.rangeLabel}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {groupSlots.map((s) => {
                  const isSelected = selected.includes(s.startTime);
                  const isUnavailable = unavailableSet.has(s.startTime);
                  return (
                    <button
                      key={s.startTime}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => onToggle(s.startTime)}
                      aria-pressed={isSelected}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        // chip kecil, rapat, border tipis
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-subtle"
                          : isUnavailable
                            ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground opacity-60"
                            : "border-border bg-card text-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {s.startTime}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
