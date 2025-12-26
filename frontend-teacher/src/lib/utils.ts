import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getByteLength(str: string) {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    if (escape(str.charAt(i)).length == 6) {
      len++;
    }
    len++;
  }
  return len;
}
