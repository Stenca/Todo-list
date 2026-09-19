export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export type TodoFilter = "all" | "active" | "completed";
