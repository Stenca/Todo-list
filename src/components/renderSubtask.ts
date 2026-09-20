import type { Subtask } from "../models/todo";
import { escapeHtml } from "../utils/dom";

export function renderSubtask(
  todoId: string,
  subtask: Subtask,
  animateInId: string | null = null,
): string {
  const isEntering = subtask.id === animateInId;
  console.log("renderSubtask", {
    subtaskId: subtask.id,
    animateInId,
    isEntering,
  });

  return `
        <li 
        class="subtask-item ${subtask.completed ? "completed" : ""} ${isEntering ? "entering" : ""}"
        data-subtask-id="${subtask.id}"
        data-parent-id="${todoId}"
        >
            <input
                type="checkbox"
                ${subtask.completed ? "checked" : ""}
                data-subtask-id="${subtask.id}"
                data-parent-id="${todoId}"
                class="subtask-checkbox"
            />
            <span class="subtask-text">${escapeHtml(subtask.text)}</span>
            <button
                data-subtask-id="${subtask.id}"
                data-parent-id="${todoId}"
                class="subtask-edit"
            >✎</button>
            <button
                data-subtask-id="${subtask.id}"
                data-parent-id="${todoId}"
                class="subtask-delete"
            >×</button>
        </li>
    `;
}
