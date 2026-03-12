const prisma = require('../config/prisma');

class TaskRepository {
  create(data) { return prisma.task.create({ data }); }
  listByProject(projectId) {
    return prisma.task.findMany({
      where: { projectId },
      include: {
        userAssignments: { include: { user: true } },
        resources: { include: { resource: true } },
        dependencies: { include: { dependsOnTask: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }
  update(id, data) { return prisma.task.update({ where: { id }, data }); }
  createDependency(taskId, dependsOnTaskId) { return prisma.taskDependency.create({ data: { taskId, dependsOnTaskId } }); }
  assignResource(taskId, resourceId, quantity = 1) {
    return prisma.taskResource.upsert({
      where: { taskId_resourceId: { taskId, resourceId } },
      create: { taskId, resourceId, quantity },
      update: { quantity },
    });
  }
  assignUser(taskId, userId) {
    return prisma.taskAssignment.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { taskId, userId },
      update: {},
    });
  }
}

module.exports = new TaskRepository();
