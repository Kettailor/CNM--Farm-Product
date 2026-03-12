const prisma = require('../config/prisma');

class ProjectRepository {
  create(data) { return prisma.project.create({ data }); }
  list() { return prisma.project.findMany({ include: { tasks: true, manager: true } }); }
  findById(id) { return prisma.project.findUnique({ where: { id }, include: { tasks: true, resources: true } }); }
}

module.exports = new ProjectRepository();
