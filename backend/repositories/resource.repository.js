const prisma = require('../config/prisma');

class ResourceRepository {
  create(data) { return prisma.resource.create({ data }); }
  list(projectId) { return prisma.resource.findMany({ where: projectId ? { projectId } : undefined, include: { taskLinks: true } }); }
}

module.exports = new ResourceRepository();
