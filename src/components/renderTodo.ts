import type { Todo } from "../models/todo";
import { escapeHtml } from "../utils/dom";
import { renderSubtask } from "./renderSubtask";

export function renderTodo(
  todo: Todo,
  animateInId: string | null = null,
  addingSubtaskForId: string | null = null,
): string {
  const subtasks = todo.subtasks ?? [];
  const isAdding = addingSubtaskForId === todo.id;

  return `
    <li 
        class="todo-item ${todo.id === animateInId ? "entering" : ""}"  
        data-id="${todo.id}" 
        draggable="true"
    >
      <div class="todo-main">
        <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
        <input 
          type="checkbox" 
          ${todo.completed ? "checked" : ""}
          data-id="${todo.id}"
          class="todo-item-checkbox"
        />
        <span 
          class="todo-item-text ${todo.completed ? "completed" : ""}"
          title="${escapeHtml(todo.text)}"
        >
          ${escapeHtml(todo.text)}
        </span>
        <button data-id="${todo.id}" class="todo-item-add-subtask" aria-label="Add subtask">+</button>
        <button data-id="${todo.id}" class="todo-item-edit" aria-label="Edit todo">✎</button>
        <button data-id="${todo.id}" class="todo-item-delete" aria-label="Delete todo">×</button>
      </div>

      ${
        subtasks.length > 0 || isAdding
          ? `
            <ul class="subtask-list">
            <li class="subtask-divider"></li>
              ${subtasks.map((s) => renderSubtask(todo.id, s, animateInId)).join("")}
              ${
                isAdding
                  ? `
                    <li class="subtask-item subtask-adding">
                    <form class="subtask-add-form" data-parent-id="${todo.id}">
                        <input 
                            type="text" 
                            class="subtask-add-input" 
                            placeholder="New subtask..."
                            data-parent-id="${todo.id}"
                        />
                        <button type="submit" class="subtask-add-submit">Add</button>
                      </form>
                    </li>
                  `
                  : ""
              }
            </ul>
          `
          : ""
      }
    </li>
  `;
}
