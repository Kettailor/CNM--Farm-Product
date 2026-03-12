const authService = require('../services/auth.service');

exports.register = async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
};

exports.login = async (req, res) => {
  try {
    const response = await authService.login(req.body.email, req.body.password);
    res.json(response);
  } catch {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};
