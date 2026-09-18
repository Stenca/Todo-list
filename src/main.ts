import "./style.css";
import { TodoService } from "./services/todoService";
import { renderTodoList } from "./components/todoList";
import { renderTodoForm } from "./components/todoForm";
import { renderStats } from "./components/todoStats";
import { escapeHtml, getElement } from "./utils/dom";
import type { Todo, TodoFilter } from "./models/todo";

const UNDO_TOAST_DURATION = 7000;
const ANIMATION_DURATION = 300;
const SCROLL_ZONE = 60;
const SCROLL_SPEED = 3;
const STAGGER = 40;
const SEARCH_DEBOUNCE = 200;

let animateInId: string | null = null;
let scrollAnimationId: number | null = null;
let scrollDirection = 0;
let draggedId: string | null = null;
let undoTimer: number | null = null;
let searchQuery = "";
let searchTimeout: number | null = null;

const service = new TodoService();
const app = getElement<HTMLDivElement>("#app");

let currentFilter: TodoFilter = "all";

function render() {
  const container = document.querySelector(
    ".todo-list-container",
  ) as HTMLElement;
  const scrollTop = container?.scrollTop ?? 0;
  const todos = getVisibleTodos();
  const stats = service.getStats();

  app.innerHTML = `
    <h1>Todo List</h1>
    ${renderTodoForm()}
    <div id="todo-filters" class="todo-filters">
      <button data-action="filter" 
        data-filter="all"
        class="${currentFilter === "all" ? "active" : ""}"
      >All
      </button>
      <button data-action="filter"
        data-filter="active"
        class="${currentFilter === "active" ? "active" : ""}"
      >Active
      </button>
      <button data-action="filter"
        data-filter="completed"
        class="${currentFilter === "completed" ? "active" : ""}"
      >Completed
      </button>
    </div>
    <div class="todo-search">
      <input
        type="search"
        id="todo-search"
        class="todo-search-input"
        placeholder="Search todos..."
        value="${escapeHtml(searchQuery)}"
      />
    </div>
    <div class="todo-list-container">
      ${renderTodoList(todos, currentFilter, animateInId, searchQuery)}
    </div>
    <div id="todo-stats">
      ${renderStats(stats.total, stats.completed, stats.remaining)}
    </div>
    <button
      data-action="clear-completed" 
      id="clear-completed" 
      ${stats.completed === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ""}
    >
      ${stats.completed > 0 ? `🗑️ Clear Completed (${stats.completed})` : "No completed todos"}
    </button>
  `;

  const newContainer = document.querySelector(
    ".todo-list-container",
  ) as HTMLElement;
  if (newContainer) {
    newContainer.scrollTop = scrollTop;
  }
}

function setupEventListeners() {
  app.addEventListener("submit", handleSubmit);
  app.addEventListener("change", handleChange);
  app.addEventListener("click", handleClick);
  app.addEventListener("input", handleSearchInput);

  app.addEventListener("dragstart", handleDragStart);
  app.addEventListener("dragend", handleDragEnd);
  app.addEventListener("dragover", handleDragOver);
  app.addEventListener("drop", handleDrop);
}

function handleSubmit(e: Event): void {
  const form = e.target as HTMLFormElement;
  if (form.id !== "todo-form") return;

  e.preventDefault();
  const input = document.getElementById("todo-input") as HTMLInputElement;
  if (input && input.value.trim()) {
    const todo = service.addTodo(input.value);
    input.value = "";
    animateInId = todo.id;
    render();
    animateInId = null;
    focusInput();
  }
}

function handleChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.type !== "checkbox" || !target.dataset.id) return;

  const id = target.dataset.id;

  animateExit(id, () => {
    animateInId = id;
    service.toggleTodo(id);
    render();
    animateInId = null;
  });
}

function handleFilterClick(target: HTMLElement): void {
  const filter = target.dataset.filter as TodoFilter;
  if (!filter) return;

  currentFilter = filter;
  render();
}

function handleClearCompleted(): void {
  const todos = service.getTodos();

  const removed = todos
    .map((todo, index) => ({ todo, index }))
    .filter(({ todo }) => todo.completed);

  if (removed.length === 0) return;

  removed.forEach(({ todo }, i) => {
    const element = document.querySelector(
      `.todo-item[data-id="${todo.id}"]`,
    ) as HTMLElement;

    if (!element) return;

    element.style.animationDelay = `${i * STAGGER}ms`;
    element?.classList.add("exiting");
  });

  const totalDelay = ANIMATION_DURATION + (removed.length - 1) * STAGGER;

  setTimeout(() => {
    service.clearCompleted();
    render();

    showUndoToast(
      `${removed.length} completed todo${removed.length > 1 ? "s" : ""} cleared :`,
      () => {
        removed
          .sort((a, b) => a.index - b.index)
          .forEach(({ todo, index }) => {
            service.restoreTodo(todo, index);
          });
        animateInId = removed[0]?.todo.id ?? null;
        render();
        animateInId = null;
      },
    );
  }, totalDelay);
}

function handleDelete(target: HTMLElement): void {
  const id = target.dataset.id;
  if (!id) return;

  const todos = service.getTodos();
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return;

  const todo = todos[index];
  animateExit(id, () => {
    service.deleteTodo(id);
    render();

    showUndoToast("Todo deleted :", () => {
      service.restoreTodo(todo, index);
      animateInId = id;
      render();
      animateInId = null;
    });
  });
}

function handleEdit(target: HTMLElement): void {
  const id = target.dataset.id;
  if (!id) return;
  startEditing(id);
}

function handleClick(e: Event): void {
  const target = e.target as HTMLElement;

  if (target.classList.contains("todo-item-delete")) {
    handleDelete(target);
    return;
  }

  if (target.classList.contains("todo-item-edit")) {
    handleEdit(target);
    return;
  }

  if (target.id === "clear-completed") {
    handleClearCompleted();
    return;
  }

  if (target.dataset.filter) {
    handleFilterClick(target);
    return;
  }
}

function handleSearchInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.id !== "todo-search") return;

  const value = target.value;
  if (searchTimeout !== null) clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    searchQuery = value;
    render();

    const newInput = document.getElementById("todo-search") as HTMLInputElement;
    newInput?.focus();
    newInput?.setSelectionRange(value.length, value.length);
  }, SEARCH_DEBOUNCE);
}

function handleDragStart(e: DragEvent): void {
  const target = e.target as HTMLElement;
  const todoItem = target.closest(".todo-item") as HTMLElement;
  if (!todoItem) return;

  draggedId = todoItem.dataset.id || null;
  if (!draggedId) return;
  todoItem.classList.add("dragging");

  e.dataTransfer?.setData("text/plain", draggedId);
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
  }
}

function handleDragEnd(e: DragEvent): void {
  stopAutoScroll();
  const target = e.target as HTMLElement;
  const todoItem = target.closest(".todo-item") as HTMLElement;
  if (todoItem) todoItem.classList.remove("dragging");

  document.querySelectorAll(".todo-item").forEach((el) => {
    el.classList.remove("drag-over");
  });
  draggedId = null;
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  autoScroll(e);

  const target = e.target as HTMLElement;
  const todoItem = target.closest(".todo-item") as HTMLElement;
  if (!todoItem) return;
  document.querySelectorAll(".todo-item").forEach((el) => {
    el.classList.remove("drag-over");
  });
  todoItem.classList.add("drag-over");
}

function handleDrop(e: DragEvent): void {
  e.preventDefault();
  stopAutoScroll();
  const target = e.target as HTMLElement;
  const todoItem = target.closest(".todo-item") as HTMLElement;
  if (!todoItem || !draggedId) return;
  const dropId = todoItem.dataset.id;
  if (!dropId || dropId === draggedId) return;

  const todos = service.getTodos();
  const fromIndex = todos.findIndex((t) => t.id === draggedId);
  const toIndex = todos.findIndex((t) => t.id === dropId);
  if (fromIndex === -1 || toIndex === -1) return;
  service.reorderTodos(fromIndex, toIndex);
  render();
}

function startEditing(id: string): void {
  const todoItem = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (!todoItem) return;

  const textSpan = todoItem.querySelector(".todo-item-text") as HTMLElement;
  const currentText = textSpan.textContent?.trim() || "";

  textSpan.innerHTML = `
    <input 
      type="text" 
      class="todo-item-edit-input" 
      value="${currentText}"
      data-id="${id}"
    />
  `;

  const input = textSpan.querySelector(
    ".todo-item-edit-input",
  ) as HTMLInputElement;
  if (!input) return;

  input.focus();
  input.select();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveEdit(id, input.value);
    if (e.key === "Escape") render();
  });

  input.addEventListener("blur", () => saveEdit(id, input.value));
}

function saveEdit(id: string, newText: string): void {
  if (newText.trim()) {
    service.editTodo(id, newText);
  }
  render();
}

function showUndoToast(message: string, onUndo: () => void): void {
  if (undoTimer !== null) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }

  document.querySelector(".undo-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "undo-toast";
  toast.innerHTML = `
    <span>${message}</span>
    <button class="undo-btn" type="button">Undo</button>
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("visible"));

  toast.querySelector(".undo-btn")?.addEventListener("click", () => {
    onUndo();
    dismissToast();
  });

  undoTimer = window.setTimeout(() => {
    dismissToast();
  }, UNDO_TOAST_DURATION);
}

function dismissToast(): void {
  if (undoTimer !== null) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }

  const toast = document.querySelector(".undo-toast");
  if (!toast) return;
  toast.classList.remove("visible");
  setTimeout(() => toast.remove(), ANIMATION_DURATION);
}

function focusInput(): void {
  const input = document.getElementById("todo-input") as HTMLInputElement;
  input?.focus();
}

function autoScroll(e: DragEvent): void {
  const container = document.querySelector(
    ".todo-list-container",
  ) as HTMLElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const y = e.clientY;

  if (y - rect.top < SCROLL_ZONE) {
    scrollDirection = -1;
  } else if (rect.bottom - y < SCROLL_ZONE) {
    scrollDirection = 1;
  } else {
    scrollDirection = 0;
  }

  if (scrollDirection !== 0 && scrollAnimationId === null) {
    scrollLoop();
  }
}

function scrollLoop(): void {
  const container = document.querySelector(
    ".todo-list-container",
  ) as HTMLElement;
  if (!container || scrollDirection === 0) {
    scrollAnimationId = null;
    return;
  }

  container.scrollTop += scrollDirection * SCROLL_SPEED;
  scrollAnimationId = requestAnimationFrame(scrollLoop);
}

function stopAutoScroll(): void {
  scrollDirection = 0;
  if (scrollAnimationId !== null) {
    cancelAnimationFrame(scrollAnimationId);
    scrollAnimationId = null;
  }
}

function animateExit(elementId: string, callback: () => void): void {
  const element = document.querySelector(
    `.todo-item[data-id="${elementId}"]`,
  ) as HTMLElement;
  if (!element) {
    callback();
    return;
  }

  element.classList.add("exiting");

  setTimeout(callback, ANIMATION_DURATION);
}

function getVisibleTodos(): Todo[] {
  const todos = service.getSortedTodos(currentFilter);
  if (!searchQuery.trim()) return todos;

  const q = searchQuery.toLowerCase();
  return todos.filter((t) => t.text.toLowerCase().includes(q));
}

setupEventListeners();
render();
