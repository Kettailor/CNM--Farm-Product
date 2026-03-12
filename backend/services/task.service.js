const prisma = require('../config/prisma');
const taskRepository = require('../repositories/task.repository');

class TaskService {
  create(payload) { return taskRepository.create(payload); }
  listByProject(projectId) { return taskRepository.listByProject(projectId); }

  async updateProgress(taskId, progress, userId, comment) {
    const status = progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'TODO';
    const task = await taskRepository.update(taskId, { progress, status });
    await prisma.progressLog.create({ data: { taskId, progress, updatedById: userId, comment } });
    return task;
  }

  markCompleted(taskId, userId) {
    return this.updateProgress(taskId, 100, userId, 'Marked as completed');
  }

  assignResource(taskId, resourceId, quantity) {
    return taskRepository.assignResource(taskId, resourceId, quantity);
  }

  assignUser(taskId, userId) {
    return taskRepository.assignUser(taskId, userId);
  }

  addDependency(taskId, dependsOnTaskId) {
    return taskRepository.createDependency(taskId, dependsOnTaskId);
  }
}

module.exports = new TaskService();
