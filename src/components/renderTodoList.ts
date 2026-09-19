import { type Todo, type TodoFilter } from "../models/todo";
import { escapeHtml } from "../utils/dom";
import { renderTodo } from "./renderTodo";

export function renderTodoList(
  todos: Todo[],
  filter: TodoFilter,
  animateInId: string | null = null,
  searchQuery = "",
  addingSubtaskForId: string | null = null,
): string {
  if (todos.length === 0) {
    return `<div class="todo-empty">${emptyMessageFor(filter, searchQuery)}</div>`;
  }

  const active = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return `
    <ul class="todo-list">
      ${active.map((todo) => renderTodo(todo, animateInId, addingSubtaskForId)).join("")}
      ${
        completed.length > 0
          ? `
            <li class="todo-divider">
              <span>Completed (${completed.length})</span>
            </li>
            ${completed.map((todo) => renderTodo(todo, animateInId, addingSubtaskForId)).join("")}
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
