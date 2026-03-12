const prisma = require('../config/prisma');

class UserRepository {
  create(data) { return prisma.user.create({ data }); }
  findByEmail(email) { return prisma.user.findUnique({ where: { email } }); }
  list() { return prisma.user.findMany({ orderBy: { createdAt: 'desc' } }); }
}

module.exports = new UserRepository();
