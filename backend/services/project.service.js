const projectRepository = require('../repositories/project.repository');
const { calculateProjectProgress } = require('../utils/project-progress');

class ProjectService {
  create(payload) { return projectRepository.create(payload); }
  async list() {
    const projects = await projectRepository.list();
    return projects.map((project) => ({
      ...project,
      progress: calculateProjectProgress(project.tasks),
    }));
  }
}

module.exports = new ProjectService();
