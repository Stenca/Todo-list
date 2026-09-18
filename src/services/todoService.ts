import { type Todo, type TodoFilter } from "../models/todo";

export class TodoService {
  private todos: Todo[] = [];
  private storageKey = "todos";

  constructor() {
    this.loadFromStorage();
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
      text: text.trim(),
      completed: false,
      createdAt: new Date(),
    };
    this.todos.unshift(todo);
    this.saveToStorage();
    return todo;
  }

  toggleTodo(id: string): void {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveToStorage();
    }
  }

  editTodo(id: string, newContent: string): void {
    const todo = this.todos.find((t) => t.id === id);
    if (todo && newContent.trim()) {
      todo.text = newContent.trim();
      this.saveToStorage();
    }
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

  restoreTodo(todo: Todo, index: number): void {
    if (this.todos.some((t) => t.id === todo.id)) return;
    const safeIndex = Math.max(0, Math.min(index, this.todos.length));
    this.todos.splice(safeIndex, 0, todo);
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
