export function renderTodoForm(): string {
  return `
    <form id ="todo-form" class="todo-form">
        <input
            type="text"
            id="todo-input"
            placeholder="Add a new todo..."
            class="todo-input"
            required
        />
        <button type="submit" class="todo-submit">
            Add
        </button>
    </form>
  `;
}
