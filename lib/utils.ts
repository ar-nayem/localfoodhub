import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY_SYMBOL } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number): string {
  return `${CURRENCY_SYMBOL}${Math.round(amount).toLocaleString()}`;
}

/** Human-friendly order number, e.g. "A10482". Not cryptographically meaningful —
 * uniqueness is enforced by the DB's `orderNumber` unique constraint, this just needs to
 * look nice on a receipt / kitchen ticket. */
export function generateOrderNumber(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `${letter}${digits}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** "153****2848" — enough to recognize which saved contact this is, never enough to
 * actually dial from the screen. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}
