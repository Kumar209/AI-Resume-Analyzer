import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

// Utility function to merge class names conditionally
// Usage: cn('class1', condition && 'class2', 'class3')
// Returns: 'class1 class2 class3' if condition is true, otherwise 'class1 class3'
// helps in managing dynamic class names in React components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format file sizes into human-readable strings
// Usage: formatSize(1024) returns '1 KB'
// Supports Bytes, KB, MB, GB, TB
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  // Determine the appropriate unit by calculating the log
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Format with 2 decimal places and round
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const generateUUID = () => crypto.randomUUID();
