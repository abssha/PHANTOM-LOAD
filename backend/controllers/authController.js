import bcrypt from 'bcryptjs';
import { createAuthToken } from '../config/auth.js';
import { User } from '../models/User.js';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function serializeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export const authController = {
  me(req, res) {
    res.json({ user: serializeUser(req.user) });
  },

  async register(req, res, next) {
    try {
      const name = req.body.name.trim();
      const email = normalizeEmail(req.body.email);
      const password = req.body.password;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, password_hash });
      const token = createAuthToken(user);

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: serializeUser(user)
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const email = normalizeEmail(req.body.email);
      const password = req.body.password;

      const user = await User.findOne({ email }).select('+password_hash');
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = createAuthToken(user);

      res.json({
        message: 'Login successful',
        token,
        user: serializeUser(user)
      });
    } catch (err) {
      next(err);
    }
  }
};
