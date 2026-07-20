import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uniqueById<T extends { _id?: unknown }>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length === 0) return []
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const id = String(item?._id ?? "")
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return out
}