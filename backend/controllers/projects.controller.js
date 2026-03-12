const projectService = require('../services/project.service');

exports.createProject = async (req, res) => {
  const project = await projectService.create(req.body);
  res.status(201).json(project);
};

exports.listProjects = async (_req, res) => {
  const projects = await projectService.list();
  res.json(projects);
};
