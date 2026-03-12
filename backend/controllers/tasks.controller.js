const taskService = require('../services/task.service');

exports.createTask = async (req, res) => {
  const task = await taskService.create(req.body);
  res.status(201).json(task);
};

exports.listTasks = async (req, res) => {
  const tasks = await taskService.listByProject(req.params.projectId);
  res.json(tasks);
};

exports.updateProgress = async (req, res) => {
  const task = await taskService.updateProgress(req.params.taskId, req.body.progress, req.user.id, req.body.comment);
  res.json(task);
};

exports.markCompleted = async (req, res) => {
  const task = await taskService.markCompleted(req.params.taskId, req.user.id);
  res.json(task);
};

exports.assignResource = async (req, res) => {
  const output = await taskService.assignResource(req.params.taskId, req.body.resourceId, req.body.quantity);
  res.json(output);
};

exports.assignUser = async (req, res) => {
  const output = await taskService.assignUser(req.params.taskId, req.body.userId);
  res.json(output);
};

exports.addDependency = async (req, res) => {
  const output = await taskService.addDependency(req.params.taskId, req.body.dependsOnTaskId);
  res.status(201).json(output);
};
