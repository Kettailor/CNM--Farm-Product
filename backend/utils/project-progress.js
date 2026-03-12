function calculateProjectProgress(tasks) {
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, task) => sum + task.progress, 0);
  return Math.round(total / tasks.length);
}

module.exports = { calculateProjectProgress };
