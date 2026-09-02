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
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] focus-visible:ring-offset-2 ${
        checked ? "bg-[#3E7C6B]" : "bg-[#D1A438]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
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
    <section className="overflow-hidden rounded-xl border border-[#405E5C]/15 bg-[#FAFCFB] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#405E5C]/10 bg-[#E5EFF0]/50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#263B3A]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#405E5C]/10 text-[#405E5C]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
            </svg>
          </span>
          Status Fasilitas
        </h2>
        {inRepair > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#D1A438]/12 px-2 py-0.5 text-[11px] font-semibold text-[#8A6D1F] ring-1 ring-inset ring-[#D1A438]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D1A438]" />
            {inRepair} perbaikan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#3E7C6B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#3E7C6B] ring-1 ring-inset ring-[#3E7C6B]/25">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3E7C6B]" />
            semua aktif
          </span>
        )}
      </div>

      <ul>
        {interactive.map((f) => {
          const active = f.status === "aktif";
          return (
            <li
              key={f.id}
              className={`flex items-center justify-between gap-3 border-b border-[#405E5C]/10 px-4 py-3 transition-colors last:border-0 ${
                active ? "bg-white hover:bg-[#3E7C6B]/5" : "bg-[#D1A438]/6 hover:bg-[#D1A438]/10"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#263B3A]">{f.nama}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#3E7C6B]" : "bg-[#D1A438]"}`}
                  />
                  <span className={`font-medium ${active ? "text-[#3E7C6B]" : "text-[#8A6D1F]"}`}>
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
          className={`animate-rv-fade border-t px-4 py-2.5 text-xs ${
            noticeTone === "ok"
              ? "border-[#3E7C6B]/20 bg-[#3E7C6B]/8 text-[#3E7C6B]"
              : "border-[#D1A438]/25 bg-[#D1A438]/10 text-[#8A6D1F]"
          }`}
        >
          {notice}
        </div>
      )}
    </section>
  );
}
