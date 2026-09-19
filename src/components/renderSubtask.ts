import type { Subtask } from "../models/todo";
import { escapeHtml } from "../utils/dom";

export function renderSubtask(todoId: string, subtask: Subtask): string {
  return `
        <li 
        class="substask-item $ {subtask.completed ? "completed : ""}"
        data-subtask-id="${subtask.id}"
        data-parent-id="${todoId}"
        >
            <input
                type="checkbox"
                ${subtask.completed ? "checked" : ""}
                data-substask-id="${subtask.id}"
                data-parent-id="${todoId}"
                class="subtask-checkbox"
            />
            <span class="subtask-text">${escapeHtml(subtask.text)}</span>
            <button
                data-substask-id="${subtask.id}"
                data-parent-id="${todoId}"
                class="subtask-delete"
            >×</button>
        </li>
    `;
}
