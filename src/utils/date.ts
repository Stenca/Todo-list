import type { Todo } from "../models/todo";

export function formatDueDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays < 7) return `${diffDays} days`;

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateInputValue(value: string): Date | null {
  if (!value) return null;

  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isOverdue(todo: Todo): boolean {
  if (!todo.dueDate || todo.completed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(todo.dueDate);
  target.setHours(0, 0, 0, 0);

  return target.getTime() < today.getTime();
}
