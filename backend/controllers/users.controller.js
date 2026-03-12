const userRepository = require('../repositories/user.repository');

exports.listUsers = async (_req, res) => {
  const users = await userRepository.list();
  res.json(users);
};
