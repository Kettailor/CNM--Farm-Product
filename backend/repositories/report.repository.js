const prisma = require('../config/prisma');

class ReportRepository {
  activity(projectId) {
    return prisma.activityLog.findMany({ where: projectId ? { projectId } : undefined, include: { user: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}

module.exports = new ReportRepository();
