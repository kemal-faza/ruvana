"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Bernilai false pada render server dan render hidrasi pertama, lalu true di
// klien. Form memakainya untuk menonaktifkan tombol submit sampai React aktif,
// agar submit native sebelum hidrasi tidak membawa kata sandi ke URL.
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
