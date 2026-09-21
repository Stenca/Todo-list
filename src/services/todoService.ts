import { type Todo, type TodoFilter, type Subtask } from "../models/todo";
import { capitalize } from "../utils/string";

export class TodoService {
  private todos: Todo[] = [];
  private storageKey = "todos";

  constructor() {
    this.loadFromStorage();
  }

  private findTodo(todoId: string): Todo | undefined {
    return this.todos.find((t) => t.id === todoId);
  }

  private syncCompletion(todo: Todo): void {
    if (!todo.subtasks) return;

    if (todo.subtasks.length > 0) {
      todo.completed = todo.subtasks.every((s) => s.completed);
    }
  }

  private loadFromStorage(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.todos = JSON.parse(saved, (key, value) => {
        if (key === "createdAt") return new Date(value);
        return value;
      });
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.todos));
  }

  getTodos(filter: TodoFilter = "all"): Todo[] {
    switch (filter) {
      case "active":
        return this.todos.filter((t) => !t.completed);
      case "completed":
        return this.todos.filter((t) => t.completed);
      default:
        return this.todos;
    }
  }

  getSortedTodos(filter: TodoFilter = "all"): Todo[] {
    const todos = this.getTodos(filter);
    if (filter !== "all") return todos;

    const active = todos.filter((t) => !t.completed);
    const completed = todos.filter((t) => t.completed);

    return [...active, ...completed];
  }

  addTodo(text: string): Todo {
    const todo: Todo = {
      id: crypto.randomUUID(),
      text: capitalize(text),
      completed: false,
      createdAt: new Date(),
      subtasks: [],
    };
    this.todos.unshift(todo);
    this.saveToStorage();
    return todo;
  }

  addSubtask(todoId: string, text: string): void {
    const todo = this.findTodo(todoId);
    const trimmed = capitalize(text);
    if (!todo || !trimmed) return;

    todo.subtasks ??= [];
    todo.subtasks.push({
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
    });

    this.saveToStorage();
  }

  toggleTodo(id: string): void {
    const todo = this.findTodo(id);
    if (!todo) return;
    if (todo) {
      todo.completed = !todo.completed;
    }

    if (todo.completed && todo.subtasks) {
      todo.subtasks.forEach((s) => (s.completed = true));
    }
    this.saveToStorage();
  }

  toggleSubtask(todoId: string, subtaskId: string): void {
    const todo = this.findTodo(todoId);
    if (!todo?.subtasks) return;

    const subtask = todo.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    subtask.completed = !subtask.completed;

    this.syncCompletion(todo);

    this.saveToStorage();
  }

  editTodo(id: string, newContent: string): void {
    const todo = this.findTodo(id);
    const trimmed = capitalize(newContent);
    if (todo && trimmed) {
      todo.text = trimmed;
      this.saveToStorage();
    }
  }

  editSubtask(todoId: string, subtaskId: string, newContent: string): void {
    const todo = this.findTodo(todoId);
    const trimmed = capitalize(newContent);
    if (!todo || !trimmed) return;
    const subtask = todo.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    subtask.text = trimmed;
    this.saveToStorage();
  }

  reorderTodos(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.todos.length ||
      toIndex >= this.todos.length
    ) {
      return;
    }
    const [moved] = this.todos.splice(fromIndex, 1);
    this.todos.splice(toIndex, 0, moved);
    this.saveToStorage();
  }

  deleteTodo(id: string): void {
    this.todos = this.todos.filter((t) => t.id !== id);
    this.saveToStorage();
  }

  deleteSubtask(todoId: string, subtaskId: string): void {
    const todo = this.findTodo(todoId);
    if (!todo) return;

    todo.subtasks = todo.subtasks.filter((s) => s.id !== subtaskId);
    this.saveToStorage();
  }

  restoreTodo(todo: Todo, index: number): void {
    if (this.todos.some((t) => t.id === todo.id)) return;

    const safeIndex = Math.max(0, Math.min(index, this.todos.length));
    this.todos.splice(safeIndex, 0, todo);
    this.saveToStorage();
  }

  restoreSubtask(todoId: string, subtask: Subtask, index: number): void {
    const todo = this.findTodo(todoId);
    if (!todo?.subtasks) return;
    if (todo.subtasks.some((s) => s.id === subtask.id)) return;

    const safeIndex = Math.max(0, Math.min(index, todo.subtasks.length));
    todo.subtasks.splice(safeIndex, 0, subtask);

    this.saveToStorage();
  }

  clearCompleted(): void {
    this.todos = this.todos.filter((t) => !t.completed);
    this.saveToStorage();
  }

  getStats() {
    const total = this.todos.length;
    const completed = this.todos.filter((t) => t.completed).length;
    return {
      total,
      completed,
      remaining: total - completed,
    };
  }
}
