const reportService = require('../services/report.service');

exports.dashboard = async (req, res) => {
  const data = await reportService.dashboard(req.query.projectId);
  res.json(data);
};
