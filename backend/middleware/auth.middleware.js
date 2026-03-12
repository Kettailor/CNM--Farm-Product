const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });

  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), jwtSecret);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;
