import { type Todo, type TodoFilter } from "../models/todo";

export function renderTodoList(todos: Todo[], filter: TodoFilter): string {
  if (todos.length === 0) {
    const message = emptyMessageFor(filter);
    return `<div class="todo-empty">${message}</div>`;
  }

  const active = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  const renderItem = (todo: Todo) => `
    <li class="todo-item" data-id="${todo.id}" draggable="true">
      <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
      <input 
        type="checkbox" 
        ${todo.completed ? "checked" : ""}
        data-id="${todo.id}"
        class="todo-item-checkbox"
      />
      <span class="todo-item-text ${todo.completed ? "completed" : ""}">
        ${todo.text}
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

  function emptyMessageFor(filter: TodoFilter) {
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
}
