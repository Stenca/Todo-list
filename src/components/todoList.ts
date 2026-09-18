import { type Todo, type TodoFilter } from "../models/todo";
import { escapeHtml } from "../utils/dom";

export function renderTodoList(
  todos: Todo[],
  filter: TodoFilter,
  animateInId: string | null = null,
  searchQuery = "",
): string {
  if (todos.length === 0) {
    return `<div class="todo-empty">${emptyMessageFor(filter, searchQuery)}</div>`;
  }

  const active = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  const renderItem = (todo: Todo) => `
    <li class="todo-item ${todo.id === animateInId ? "entering" : ""}" data-id="${todo.id}" draggable="true">
      <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
      <input 
        type="checkbox" 
        ${todo.completed ? "checked" : ""}
        data-id="${todo.id}"
        class="todo-item-checkbox"
      />
      <span class="todo-item-text ${todo.completed ? "completed" : ""}">
        ${escapeHtml(todo.text)}
      </span>
      <button data-id="${todo.id}" class="todo-item-edit" aria-label="Edit todo">✎</button>
      <button data-id="${todo.id}" class="todo-item-delete" aria-label="Delete todo">×</button>
    </li>
  `;

  return `
    <ul class="todo-list">
      ${active.map(renderItem).join("")}
      ${
        completed.length > 0
          ? `
            <li class="todo-divider">
              <span>Completed (${completed.length})</span>
            </li>
            ${completed.map(renderItem).join("")}
          `
          : ""
      }
    </ul>
  `;
}

function emptyMessageFor(filter: TodoFilter, searchQuery: string) {
  if (searchQuery.trim()) {
    return `No todos match for : ${escapeHtml(searchQuery)}`;
  }

  switch (filter) {
    case "active":
      return "No active todos, nice work.";
    case "completed":
      return "No completed todos yet.";
    case "all":
    default:
      return "No todos yet, add one above.";
  }
}
