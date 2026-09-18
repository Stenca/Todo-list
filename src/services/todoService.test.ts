import type { Todo } from "../models/todo";
import { TodoService } from "./todoService";
import { describe, it, expect, beforeEach } from "vitest";

describe("TodoService", () => {
  let service: TodoService;

  beforeEach(() => {
    localStorage.clear();
    service = new TodoService();
  });

  describe("addTodo", () => {
    it("should add a new todo", () => {
      const todo = service.addTodo("Buy milk");
      expect(todo.text).toBe("Buy milk");
      expect(todo.completed).toBe(false);
      expect(todo.id).toBeDefined();
      expect(todo.createdAt).toBeInstanceOf(Date);
    });

    it("should add a new todo at the top of the list", () => {
      service.addTodo("todo1");
      service.addTodo("todo2");
      const todos = service.getTodos();
      expect(todos[0].text).toBe("todo2");
      expect(todos[1].text).toBe("todo1");
    });

    it("should trim white spaces from a todo text", () => {
      const todo = service.addTodo("    Buy milk    ");
      expect(todo.text).toBe("Buy milk");
    });

    it("should generate unique ids", () => {
      const todo1 = service.addTodo("todo1");
      const todo2 = service.addTodo("todo2");
      expect(todo1.id).not.toBe(todo2.id);
    });

    it("should save to local storage", () => {
      service.addTodo("Buy milk");
      const saved = localStorage.getItem("todos");
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].text).toBe("Buy milk");
    });
  });

  describe("toggleTodo", () => {
    it("should toggle a todo completed status", () => {
      const todo = service.addTodo("Buy milk");
      expect(todo.completed).toBe(false);
      service.toggleTodo(todo.id);
      expect(todo.completed).toBe(true);
    });

    it("should toggle from completed to imcomplete", () => {
      const todo = service.addTodo("Buy bread");
      service.toggleTodo(todo.id);
      service.toggleTodo(todo.id);
      expect(todo.completed).toBe(false);
    });

    it("should do nothing if ID is invalid", () => {
      const todo = service.addTodo("Buy bread");
      service.toggleTodo("Invalid id");
      expect(todo.completed).toBe(false);
    });
  });

  describe("editTodo", () => {
    let todo: Todo;
    beforeEach(() => {
      todo = service.addTodo("Buy milk");
    });

    it("should edit a todo's text", () => {
      service.editTodo(todo.id, "Buy oat milk");
      expect(service.getTodos()[0].text).toBe("Buy oat milk");
    });

    it("should trim white spaces", () => {
      service.editTodo(todo.id, "   Buy oat milk   ");
      expect(service.getTodos()[0].text).toBe("Buy oat milk");
    });

    it("should not change the completed status when editing", () => {
      service.toggleTodo(todo.id);
      service.editTodo(todo.id, "Buy oat milk");
      const updated = service.getTodos()[0];
      expect(updated.completed).toBe(true);
      expect(updated.text).toBe("Buy oat milk");
    });

    it("shouldn't change the id of an edited todo", () => {
      service.editTodo(todo.id, "Buy oat milk");
      expect(service.getTodos()[0].id).toBe(todo.id);
    });

    it("shouldn't change the date of an edited todo", () => {
      service.editTodo(todo.id, "Buy oat milk");
      expect(service.getTodos()[0].createdAt).toBe(todo.createdAt);
    });

    it("shouldn't edit other todos", () => {
      service.addTodo("Buy bread");
      service.editTodo(todo.id, "Buy oat milk");
      const todos = service.getTodos();
      expect(todos[0].text).toBe("Buy bread");
      expect(todos[1].text).toBe("Buy oat milk");
    });

    it("should do nothing for invalid id", () => {
      service.editTodo("invalid-id", "Buy oat milk");
      expect(service.getTodos()[0].text).toBe("Buy milk");
    });

    it("shouldn't update if new text if empty", () => {
      service.editTodo(todo.id, "");
      expect(service.getTodos()[0].text).toBe("Buy milk");
    });

    it("shouldn't update if new text if empty", () => {
      service.editTodo(todo.id, "   ");
      expect(service.getTodos()[0].text).toBe("Buy milk");
    });

    it("should save changes to local storage", () => {
      service.editTodo(todo.id, "Buy oat milk");
      const saved = JSON.parse(localStorage.getItem("todos")!);
      expect(saved[0].text).toBe("Buy oat milk");
    });

    it("should persist edits after reload", () => {
      service.editTodo(todo.id, "Buy oat milk");
      const newService = new TodoService();
      expect(newService.getTodos()[0].text).toBe("Buy oat milk");
    });

    it("should allow editing to the same text", () => {
      service.editTodo(todo.id, "Buy milk");
      expect(service.getTodos()[0].text).toBe("Buy milk");
    });

    it("should allow editing to a very long text", () => {
      const todo = service.addTodo("Buy milk");
      const longText = "a".repeat(1000);
      service.editTodo(todo.id, longText);
      expect(service.getTodos()[0].text).toBe(longText);
    });
  });

  describe("reorderTodo", () => {
    beforeEach(() => {
      service.addTodo("A");
      service.addTodo("B");
      service.addTodo("C");
    });
    it("should move a todo to a new position", () => {
      service.reorderTodos(2, 0);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("A");
      expect(todos[1].text).toBe("C");
      expect(todos[2].text).toBe("B");
    });

    it("should move a todo down", () => {
      service.reorderTodos(0, 2);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("B");
      expect(todos[1].text).toBe("A");
      expect(todos[2].text).toBe("C");
    });

    it("should swap two adjacent todos", () => {
      service.reorderTodos(0, 1);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("B");
      expect(todos[1].text).toBe("C");
      expect(todos[2].text).toBe("A");
    });

    it("should not change anything if fromIndex equals toIndex", () => {
      service.reorderTodos(1, 1);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("C");
      expect(todos[1].text).toBe("B");
      expect(todos[2].text).toBe("A");
    });

    it("should do nothing for negative fromIndex", () => {
      service.reorderTodos(-1, 0);

      const todos = service.getTodos();
      expect(todos).toHaveLength(3);
      expect(todos[0].text).toBe("C");
    });

    it("should do nothing for negative toIndex", () => {
      service.reorderTodos(0, -1);

      const todos = service.getTodos();
      expect(todos).toHaveLength(3);
      expect(todos[0].text).toBe("C");
    });

    it("should do nothing for fromIndex out of bounds", () => {
      service.reorderTodos(99, 0);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("C");
    });

    it("should do nothing for toIndex out of bounds", () => {
      service.reorderTodos(0, 99);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("C");
    });

    it("should preserve all todos", () => {
      service.reorderTodos(2, 0);

      const todos = service.getTodos();
      expect(todos).toHaveLength(3);
      expect(todos.map((t) => t.text).sort()).toEqual(["A", "B", "C"]);
    });

    it("should save the new order to localStorage", () => {
      service.reorderTodos(2, 0);

      const saved = JSON.parse(localStorage.getItem("todos")!);
      expect(saved[0].text).toBe("A");
    });

    it("should persist the new order after reload", () => {
      service.reorderTodos(2, 0);

      const newService = new TodoService();
      const todos = newService.getTodos();
      expect(todos[0].text).toBe("A");
      expect(todos[1].text).toBe("C");
      expect(todos[2].text).toBe("B");
    });

    it("should reorder across multiple moves", () => {
      service.reorderTodos(0, 2);
      service.reorderTodos(0, 1);

      const todos = service.getTodos();
      expect(todos.map((t) => t.text)).toEqual(["A", "B", "C"]);
    });
  });

  describe("deleteTodo", () => {
    it("should delete a todo", () => {
      const todo = service.addTodo("Buy rice");
      service.addTodo("Buy pasta");
      service.deleteTodo(todo.id);
      const todos = service.getTodos();
      expect(todos).toHaveLength(1);
      expect(todos[0].text).toBe("Buy pasta");
    });

    it("should do nothing if ID is invalid", () => {
      service.addTodo("Buy bread");
      service.deleteTodo("invalid id");
      expect(service.getTodos()).toHaveLength(1);
    });
  });

  describe("restoreTodo", () => {
    it("should restore a deleted todo at the given index", () => {
      service.addTodo("A");
      const b = service.addTodo("B");
      service.addTodo("C");

      service.deleteTodo(b.id);
      service.restoreTodo(b, 1);

      const todos = service.getTodos();
      expect(todos.map((t) => t.text)).toEqual(["C", "B", "A"]);
    });

    it("should restore at index 0 (top)", () => {
      service.addTodo("A");
      const b = service.addTodo("B");

      service.deleteTodo(b.id);
      service.restoreTodo(b, 0);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("B");
    });

    it("should restore at the end when index equals array length", () => {
      const a = service.addTodo("A");
      service.addTodo("B");

      service.deleteTodo(a.id);
      service.restoreTodo(a, 1);

      const todos = service.getTodos();
      expect(todos[1].text).toBe("A");
    });

    it("should restore to an empty list", () => {
      const a = service.addTodo("A");
      service.deleteTodo(a.id);

      service.restoreTodo(a, 0);

      const todos = service.getTodos();
      expect(todos).toHaveLength(1);
      expect(todos[0].text).toBe("A");
    });

    it("should clamp a negative index to 0", () => {
      service.addTodo("A");
      const b = service.addTodo("B");

      service.deleteTodo(b.id);
      service.restoreTodo(b, -5);

      const todos = service.getTodos();
      expect(todos[0].text).toBe("B");
    });

    it("should clamp an out-of-bounds index to array length", () => {
      const a = service.addTodo("A");
      service.addTodo("B");

      service.deleteTodo(a.id);
      service.restoreTodo(a, 99);

      const todos = service.getTodos();
      expect(todos[1].text).toBe("A");
    });

    it("should preserve the todo's id", () => {
      const todo = service.addTodo("A");
      service.deleteTodo(todo.id);

      service.restoreTodo(todo, 0);

      const todos = service.getTodos();
      expect(todos[0].id).toBe(todo.id);
    });

    it("should preserve the todo's completed status", () => {
      const todo = service.addTodo("A");
      service.toggleTodo(todo.id);
      service.deleteTodo(todo.id);

      service.restoreTodo(todo, 0);

      const todos = service.getTodos();
      expect(todos[0].completed).toBe(true);
    });

    it("should preserve the todo's createdAt date", () => {
      const todo = service.addTodo("A");
      const originalDate = todo.createdAt;
      service.deleteTodo(todo.id);

      service.restoreTodo(todo, 0);

      const todos = service.getTodos();
      expect(todos[0].createdAt).toEqual(originalDate);
    });

    it("should not restore the same todo twice", () => {
      const todo = service.addTodo("A");
      service.deleteTodo(todo.id);

      service.restoreTodo(todo, 0);
      service.restoreTodo(todo, 0);

      const todos = service.getTodos();
      expect(todos.length).toBeGreaterThanOrEqual(1);
    });

    it("should save to localStorage", () => {
      const todo = service.addTodo("A");
      service.deleteTodo(todo.id);
      service.restoreTodo(todo, 0);

      const saved = JSON.parse(localStorage.getItem("todos")!);
      expect(saved).toHaveLength(1);
      expect(saved[0].text).toBe("A");
    });

    it("should persist after reload", () => {
      const todo = service.addTodo("A");
      service.deleteTodo(todo.id);
      service.restoreTodo(todo, 0);

      const newService = new TodoService();
      const todos = newService.getTodos();
      expect(todos).toHaveLength(1);
      expect(todos[0].text).toBe("A");
    });

    it("should keep other todos intact", () => {
      service.addTodo("A");
      const b = service.addTodo("B");
      service.addTodo("C");

      service.deleteTodo(b.id);
      service.restoreTodo(b, 1);

      const todos = service.getTodos();
      expect(todos).toHaveLength(3);
      expect(todos.map((t) => t.text).sort()).toEqual(["A", "B", "C"]);
    });

    it("should restore at the same index it was deleted from", () => {
      service.addTodo("A");
      const b = service.addTodo("B");
      service.addTodo("C");

      const index = service.getTodos().findIndex((t) => t.id === b.id); // 1
      service.deleteTodo(b.id);
      service.restoreTodo(b, index);

      const todos = service.getTodos();
      expect(todos.findIndex((t) => t.id === b.id)).toBe(1);
    });
  });

  describe("clearCompleted", () => {
    it("should delete all completed todos", () => {
      const todo1 = service.addTodo("Buy bread");
      const todo2 = service.addTodo("Buy pasta");
      service.addTodo("Buy rice");
      service.toggleTodo(todo1.id);
      service.toggleTodo(todo2.id);
      service.clearCompleted();
      const todos = service.getTodos();
      expect(todos).toHaveLength(1);
      expect(todos[0].text).toBe("Buy rice");
    });

    it("should do nothing if no completed todo", () => {
      service.addTodo("Buy bread");
      service.clearCompleted();
      expect(service.getTodos()).toHaveLength(1);
    });
  });

  describe("get todos with filters", () => {
    beforeEach(() => {
      service.addTodo("Active 1");
      service.addTodo("Active 2");
      const todo3 = service.addTodo("Completed 1");
      service.toggleTodo(todo3.id);
    });

    it("should return all todos with 'all' filter", () => {
      expect(service.getTodos("all")).toHaveLength(3);
    });

    it("should return only active todos with 'active' filter", () => {
      const active = service.getTodos("active");
      expect(active).toHaveLength(2);
      expect(active.every((t) => !t.completed)).toBe(true);
    });

    it("should return only completed todos with 'completed' filter", () => {
      const completed = service.getTodos("completed");
      expect(completed).toHaveLength(1);
      expect(completed[0].text).toBe("Completed 1");
    });

    it("should default to 'all' filter", () => {
      expect(service.getTodos()).toHaveLength(3);
    });
  });
});
