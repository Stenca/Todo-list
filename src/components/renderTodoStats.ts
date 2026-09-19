export function renderStats(
  total: number,
  completed: number,
  remaining: number,
): string {
  return `
        <div class="todo-stats"> 
            <span>Total : ${total}</span>
            <span>Completed : ${completed}</span>
            <span>Remaining : ${remaining}</span>
        </div>
    `;
}
