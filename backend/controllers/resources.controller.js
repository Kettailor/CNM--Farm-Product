const resourceService = require('../services/resource.service');

exports.createResource = async (req, res) => {
  const resource = await resourceService.create(req.body);
  res.status(201).json(resource);
};

exports.getWorkload = async (req, res) => {
  const workload = await resourceService.workload(req.query.projectId);
  res.json(workload);
};
