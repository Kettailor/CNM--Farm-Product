const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const { jwtSecret } = require('../config/env');

class AuthService {
  async register(payload) {
    const passwordHash = await bcrypt.hash(payload.password, 10);
    return userRepository.create({
      email: payload.email,
      fullName: payload.fullName,
      passwordHash,
      role: payload.role || 'WORKER',
    });
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1d' });
    return { token, user };
  }
}

module.exports = new AuthService();
