import "./style.css";
import { TodoService } from "./services/todoService";
import { renderTodoList } from "./components/renderTodoList";
import { renderTodoForm } from "./components/renderTodoForm";
import { renderStats } from "./components/renderTodoStats";
import { escapeHtml, getElement } from "./utils/dom";
import { fromDateInputValue } from "./utils/date";
import type { Todo, TodoFilter } from "./models/todo";

const UNDO_TOAST_DURATION = 7000;
const ANIMATION_DURATION = 300;
const SCROLL_ZONE = 60;
const SCROLL_SPEED = 3;
const SEARCH_DEBOUNCE = 200;

let editingDueDateId: string | null = null;
let sortByDueDate = false;
let lastOpenedDueDateId: string | null = null;
let animateInId: string | null = null;
let addingSubtaskForId: string | null = null;
let scrollAnimationId: number | null = null;
let scrollDirection = 0;
let draggedId: string | null = null;
let undoTimer: number | null = null;
let searchQuery = "";
let searchTimeout: number | null = null;

const expandedTodos = new Set<string>();
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
    <div class="toolbar">
      <div id="todo-filters" class="todo-filters">
        <button
          data-filter="all"
          class="${currentFilter === "all" ? "active" : ""}"
        >All
        </button>
        <button
          data-filter="active"
          class="${currentFilter === "active" ? "active" : ""}"
        >Active
        </button>
        <button
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
        ${
          searchQuery.trim()
            ? `<button class="todo-search-clear">×</button>`
            : ""
        }
      </div>
      <button
        class="sort-toggle ${sortByDueDate ? "active" : ""}"
        title="Sort by due date"
      >⇅</button>
    </div>
    <div class="todo-list-container">
      ${renderTodoList(todos, currentFilter, animateInId, searchQuery, addingSubtaskForId, expandedTodos, editingDueDateId, sortByDueDate)}
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

  if (addingSubtaskForId) {
    requestAnimationFrame(() => {
      const input =
        document.querySelector<HTMLInputElement>(".subtask-add-input");
      input?.focus();
    });
  }

  if (editingDueDateId) {
    requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(".todo-due-input");
      if (!input) return;

      input.focus();

      if (lastOpenedDueDateId !== editingDueDateId) {
        input.showPicker?.();
        lastOpenedDueDateId = editingDueDateId;
      }
    });
  } else {
    lastOpenedDueDateId = null;
  }

  const newContainer = document.querySelector(
    ".todo-list-container",
  ) as HTMLElement;
  if (newContainer) {
    newContainer.scrollTop = scrollTop;
  }
}

function setupEventListeners() {
  app.addEventListener("submit", handleGlobalSubmit);
  app.addEventListener("change", handleChange);
  app.addEventListener("click", handleClick);
  app.addEventListener("keydown", handleGlobalKeydown);
  app.addEventListener("input", handleSearchInput);
  app.addEventListener("focusout", handleDateFocusOut);

  app.addEventListener("dragstart", handleDragStart);
  app.addEventListener("dragend", handleDragEnd);
  app.addEventListener("dragover", handleDragOver);
  app.addEventListener("drop", handleDrop);
}

function handleGlobalSubmit(e: Event): void {
  const form = e.target as HTMLFormElement;

  if (form.id === "todo-form") {
    handleTodoSubmit(e);
    return;
  }

  if (form.classList.contains("subtask-add-form")) {
    handleSubtaskSubmit(e);
    return;
  }
}

function handleTodoSubmit(e: Event): void {
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

function handleSubtaskSubmit(e: Event): void {
  e.preventDefault();

  const form = e.target as HTMLFormElement;
  const todoId = form.dataset.parentId;
  const input = form.querySelector<HTMLInputElement>(".subtask-add-input");
  const value = input?.value.trim();

  if (todoId && value) {
    service.addSubtask(todoId, value);
  }

  addingSubtaskForId = null;
  render();
}

function handleChange(e: Event): void {
  const target = e.target as HTMLInputElement;

  if (target.classList.contains("subtask-checkbox")) {
    handleSubtaskToggle(target);
    return;
  }

  if (target.classList.contains("todo-item-checkbox")) {
    handleTodoToggle(target);
    return;
  }

  if (target.classList.contains("todo-due-input")) {
    handleDueDateChange(target);
    return;
  }
}

function handleTodoToggle(el: HTMLInputElement): void {
  const id = el.closest<HTMLElement>(".todo-item")?.dataset.id;
  if (!id) return;

  animateExit(`.todo-item[data-id="${id}"]`, () => {
    animateInId = id;
    service.toggleTodo(id);
    render();
    animateInId = null;
  });
}

function handleSubtaskToggle(el: HTMLInputElement): void {
  const subtaskId = el.closest<HTMLElement>(".subtask-item")?.dataset.subtaskId;
  const todoId = el.closest<HTMLElement>(".todo-item")?.dataset.id;
  if (!subtaskId || !todoId) return;

  const wasCompleted = service.isTodoCompleted(todoId);
  service.toggleSubtask(todoId, subtaskId);
  const isCompleted = service.isTodoCompleted(todoId);

  if (wasCompleted !== isCompleted) {
    animateExit(todoId, () => {
      animateInId = todoId;
      render();
      animateInId = null;
    });
  } else {
    render();
  }
}

function handleDueDateChange(input: HTMLInputElement): void {
  const id = input.dataset.id;
  if (!id) return;

  const date = fromDateInputValue(input.value);
  service.setDueDate(id, date);
  editingDueDateId = null;
  render();
}

function handleFilterClick(target: HTMLElement): void {
  const filter = target.dataset.filter as TodoFilter;
  if (!filter) return;

  currentFilter = filter;
  render();
}

function handleClearSearch(): void {
  searchQuery = "";
  render();
  document.getElementById("todo-search")?.focus();
  return;
}

function handleToggleSort(): void {
  sortByDueDate = !sortByDueDate;
  render();
}

function handleClearCompleted(): void {
  const todos = service.getTodos();

  const removed = todos
    .map((todo, index) => ({ todo, index }))
    .filter(({ todo }) => todo.completed);

  if (removed.length === 0) return;

  removed.forEach(({ todo }) => {
    const element = document.querySelector(
      `.todo-item[data-id="${todo.id}"]`,
    ) as HTMLElement;

    if (!element) return;

    element?.classList.add("exiting");
  });

  const totalDelay = ANIMATION_DURATION;

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

function handleEditDueDate(id: string): void {
  editingDueDateId = id;
  render();
}

function handleDelete(id: string): void {
  const todos = service.getTodos();
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return;

  const todo = todos[index];

  animateExit(`.todo-item[data-id="${id}"]`, () => {
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

function handleDeleteSubtask(todoId: string, subtaskId: string): void {
  const todo = service.getTodos().find((t) => t.id === todoId);
  if (!todo?.subtasks) return;

  const index = todo.subtasks.findIndex((s) => s.id === subtaskId);
  if (index === -1) return;

  const subtask = todo.subtasks[index];

  animateExit(`.subtask-item[data-subtask-id="${subtaskId}"]`, () => {
    service.deleteSubtask(todoId, subtaskId);
    render();

    showUndoToast("Subtask deleted :", () => {
      service.restoreSubtask(todoId, subtask, index);
      animateInId = subtaskId;
      render();
      animateInId = null;
    });
  });
}

function handleToggleSubtasks(id: string): void {
  if (expandedTodos.has(id)) {
    expandedTodos.delete(id);
  } else {
    expandedTodos.add(id);
  }
  render();
}

function handleEnterSubtask(id: string): void {
  addingSubtaskForId = addingSubtaskForId === id ? null : id;
  render();
}

function handleEdit(id: string): void {
  startEditing(id);
}

function handleEditSubtask(todoId: string, subtaskId: string): void {
  startEditingSubtask(todoId, subtaskId);
}

function handleClick(e: Event): void {
  const target = e.target as HTMLElement;
  const todoItem = target.closest<HTMLElement>(".todo-item");
  const todoId = todoItem?.dataset.id ?? null;
  const subtaskId = target?.dataset.subtaskId ?? null;

  if (target.id === "clear-completed") {
    handleClearCompleted();
    return;
  }

  if (target.dataset.filter) {
    handleFilterClick(target);
    return;
  }

  if (target.classList.contains("todo-search-clear")) {
    handleClearSearch();
    return;
  }

  if (target.classList.contains("sort-toggle")) {
    handleToggleSort();
    return;
  }

  if (!todoId || !todoItem) return;

  if (target.classList.contains("todo-item-toggle-subtasks")) {
    handleToggleSubtasks(todoId);
    return;
  }

  if (target.classList.contains("todo-item-add-subtask")) {
    handleEnterSubtask(todoId);
    return;
  }

  if (target.classList.contains("todo-item-edit")) {
    handleEdit(todoId);
    return;
  }

  if (
    target.classList.contains("todo-due") ||
    target.classList.contains("todo-due-add")
  ) {
    handleEditDueDate(todoId);
    return;
  }

  if (target.classList.contains("todo-item-delete")) {
    handleDelete(todoId);
    return;
  }

  if (!subtaskId) return;

  if (target.classList.contains("subtask-delete")) {
    handleDeleteSubtask(todoId, subtaskId);
    return;
  }

  if (target.classList.contains("subtask-edit")) {
    handleEditSubtask(todoId, subtaskId);
    return;
  }
}

function handleGlobalKeydown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement;

  if (target.classList.contains("subtask-add-input")) {
    handleSubtaskKeyDown(e);
    return;
  }

  if (target.classList.contains("subtask-edit-input")) {
    handleSubtaskEditKeyDown(e);
    return;
  }

  if (target.classList.contains("todo-item-edit-input")) {
    handleEditKeyDown(e);
    return;
  }

  if (editingDueDateId) {
    handleDateKeydown(e);
    return;
  }
}

function handleDateKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && editingDueDateId) {
    e.preventDefault();
    editingDueDateId = null;
    render();
  }
}

function handleDateFocusOut(e: FocusEvent): void {
  const target = e.target as HTMLElement;
  if (!target.classList.contains("todo-due-input")) return;

  setTimeout(() => {
    if (!editingDueDateId) return;
    editingDueDateId = null;
    render();
  }, 200);
}

function handleSubtaskKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    addingSubtaskForId = null;
    render();
    return;
  }
}

function handleEditKeyDown(e: KeyboardEvent): void {
  const input = e.target as HTMLInputElement;
  const id = input.dataset.id;
  if (!id) return;

  if (e.key === "Enter") {
    e.preventDefault();
    saveEdit(id, input.value);
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    render();
  }
}

function handleSubtaskEditKeyDown(e: KeyboardEvent): void {
  const input = e.target as HTMLInputElement;
  const todoId = input.dataset.parentId;
  const subtaskId = input.dataset.subtaskId;
  if (!todoId || !subtaskId) return;

  if (e.key === "Enter") {
    e.preventDefault();
    saveSubtaskEdit(todoId, subtaskId, input.value);
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    render();
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
  if (!todoItem || sortByDueDate) return;

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

function replaceTextWithInput(
  container: Element,
  textSelector: string,
  inputHtml: string,
): HTMLInputElement | null {
  const textEl = container.querySelector<HTMLElement>(textSelector);
  if (!textEl) return null;

  textEl.innerHTML = inputHtml;
  const input = textEl.querySelector<HTMLInputElement>("input");
  if (!input) return null;

  input.focus();
  input.select();
  return input;
}

function startEditing(id: string): void {
  const item = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (!item) return;

  const currentText =
    item.querySelector(".todo-item-text")?.textContent?.trim() ?? "";

  const input = replaceTextWithInput(
    item,
    ".todo-item-text",
    `<input type="text" class="todo-item-edit-input" value="${escapeHtml(currentText)}" data-id="${id}" />`,
  );

  if (!input) return;

  input.addEventListener("blur", () => saveEdit(id, input.value));
}

function saveEdit(id: string, newText: string): void {
  if (newText.trim()) {
    service.editTodo(id, newText);
  }
  render();
}

function startEditingSubtask(todoId: string, subtaskId: string): void {
  const item = document.querySelector(
    `.subtask-item[data-subtask-id="${subtaskId}"]`,
  );
  if (!item) return;

  const currentText =
    item.querySelector(".subtask-text")?.textContent?.trim() ?? "";

  const input = replaceTextWithInput(
    item,
    ".subtask-text",
    `<input type="text" class="subtask-edit-input" value="${escapeHtml(currentText)}" data-subtask-id="${subtaskId}" data-parent-id="${todoId}" />`,
  );

  if (!input) return;

  input.addEventListener("blur", () =>
    saveSubtaskEdit(todoId, subtaskId, input.value),
  );
}

function saveSubtaskEdit(
  todoId: string,
  subtaskId: string,
  newText: string,
): void {
  if (newText.trim()) {
    service.editSubtask(todoId, subtaskId, newText);
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

function animateExit(selector: string, callback: () => void): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    callback();
    return;
  }

  element.classList.add("exiting");

  setTimeout(callback, ANIMATION_DURATION);
}

function getVisibleTodos(): Todo[] {
  let todos = service.getSortedTodos(currentFilter);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    todos = todos.filter((t) => t.text.toLowerCase().includes(q));
  }

  if (sortByDueDate) {
    todos = [...todos].sort(byDueDate);
  }
  return todos;
}

function byDueDate(a: Todo, b: Todo): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.getTime() - b.dueDate.getTime();
}

setupEventListeners();
render();
