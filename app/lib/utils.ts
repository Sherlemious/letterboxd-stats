import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Canonical lookup key for a film — shared across all metadata sources */
export function filmKey(name: string, year: number): string {
  return `${name.toLowerCase()}-${year}`;
}
