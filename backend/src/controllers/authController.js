'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * POST /api/auth/login
 * --------------------
 * Validates email/password credentials, issues a signed JWT on success.
 *
 * Request body: { email: string, password: string }
 * Response:     { success: true, token: string, user: { id, email, full_name, role } }
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.',
    });
  }

  try {
    // Look up the user by email
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      // Deliberately vague — do not reveal whether the email exists
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    // Constant-time password comparison
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      logger.warn('Failed login attempt', { email: user.email });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Issue JWT
    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    logger.info('Successful login', { user_id: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      token,
      user: payload,
    });
  } catch (err) {
    logger.error('Login error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during authentication.',
    });
  }
}

module.exports = { login };
