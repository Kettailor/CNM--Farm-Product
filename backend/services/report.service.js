const prisma = require('../config/prisma');
const reportRepository = require('../repositories/report.repository');

class ReportService {
  dashboard = async (projectId) => {
    const [projects, tasks, completedTasks, activity] = await Promise.all([
      prisma.project.count(),
      prisma.task.count(projectId ? { where: { projectId } } : undefined),
      prisma.task.count({ where: { ...(projectId ? { projectId } : {}), status: 'COMPLETED' } }),
      reportRepository.activity(projectId),
    ]);

    return {
      projects,
      tasks,
      completedTasks,
      completionRate: tasks ? Math.round((completedTasks / tasks) * 100) : 0,
      recentActivity: activity,
    };
  };
}

module.exports = new ReportService();
