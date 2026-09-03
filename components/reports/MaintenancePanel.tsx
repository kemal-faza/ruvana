"use client";

import { useState } from "react";
import type { Facility, StatusFasilitas } from "./types";
import { STATUS_FASILITAS_LABELS } from "./types";

interface MaintenancePanelProps {
  facilities: Facility[];
  onStatusChange: (facilityId: number, newStatus: StatusFasilitas) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Tandai fasilitas aktif" : "Tandai fasilitas dalam perbaikan"}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4953A]/50 focus-visible:ring-offset-2 ${
        checked ? "bg-[#6B9E7C]" : "bg-[#C4953A]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export default function MaintenancePanel({ facilities, onStatusChange }: MaintenancePanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"ok" | "warn">("ok");

  const toggle = (f: Facility) => {
    const newStatus: StatusFasilitas = f.status === "aktif" ? "dalam_perbaikan" : "aktif";
    onStatusChange(f.id, newStatus);
    setNoticeTone(newStatus === "aktif" ? "ok" : "warn");
    setNotice(
      newStatus === "dalam_perbaikan"
        ? `${f.nama} ditandai dalam perbaikan.`
        : `${f.nama} kembali aktif.`
    );
    window.setTimeout(() => setNotice(null), 3500);
  };

  const interactive = facilities.filter((f) => f.status !== "nonaktif");
  const inRepair = interactive.filter((f) => f.status === "dalam_perbaikan").length;

  return (
    <section className="rv-surface overflow-hidden rounded-[14px]">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <h2 className="text-[13px] font-semibold text-[#2C2A28]">Status Fasilitas</h2>
        {inRepair > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C4953A]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#8A6D1F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C4953A]" />
            {inRepair} perbaikan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6B9E7C]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#4A7A5C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6B9E7C]" />
            semua aktif
          </span>
        )}
      </div>

      <ul>
        {interactive.map((f, idx) => {
          const active = f.status === "aktif";
          return (
            <li
              key={f.id}
              className={`flex items-center justify-between gap-3 px-5 py-3 transition-colors ${
                idx < interactive.length - 1 ? "border-t border-black/[0.04]" : ""
              } ${active ? "hover:bg-black/[0.015]" : "hover:bg-[#C4953A]/[0.02]"}`}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#2C2A28]">{f.nama}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#6B9E7C]" : "bg-[#C4953A]"}`}
                  />
                  <span className={`font-medium ${active ? "text-[#6B9E7C]" : "text-[#8A6D1F]"}`}>
                    {STATUS_FASILITAS_LABELS[f.status]}
                  </span>
                </p>
              </div>
              <Toggle checked={active} onChange={() => toggle(f)} />
            </li>
          );
        })}
      </ul>

      {notice && (
        <div
          role="status"
          className={`animate-rv-fade border-t px-5 py-2.5 text-[11px] font-medium ${
            noticeTone === "ok"
              ? "border-[#6B9E7C]/15 bg-[#6B9E7C]/[0.05] text-[#4A7A5C]"
              : "border-[#C4953A]/15 bg-[#C4953A]/[0.05] text-[#8A6D1F]"
          }`}
        >
          {notice}
        </div>
      )}
    </section>
  );
}
