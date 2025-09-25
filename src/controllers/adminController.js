const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';

const adminController = {
  registerAdmin: async (req, res) => {
    try {
      const User = req.app.get('models').users;
      const { email, username, password } = req.body;

      // Validation
      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
          required: ['email', 'username', 'password']
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ success: false, message: 'Username must be between 3 and 50 characters' });
      }

      if (password.length < 6 || password.length > 35) {
        return res.status(400).json({ success: false, message: 'Password must be between 6 and 35 characters' });
      }

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        let field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
        return res.status(409).json({ success: false, message: `Admin with this ${field} already exists` });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = await User.create({
        email: email.toLowerCase().trim(),
        username: username.toLowerCase().trim(),
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        created_by: 'system',
        created_date: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Admin registered successfully',
        data: {
          user_id: newAdmin.user_id,
          email: newAdmin.email,
          username: newAdmin.username,
          role: newAdmin.role,
          status: newAdmin.status,
          created_date: newAdmin.created_date
        }
      });

    } catch (error) {
      console.error('Admin registration error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0].path;
        return res.status(409).json({ success: false, message: `${field} already exists` });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  loginAdmin: async (req, res) => {
    try {
      const User = req.app.get('models').users;
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const admin = await User.findOne({ where: { email: email.toLowerCase(), role: 'ADMIN', status: 'ACTIVE' } });

      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });

      const token = jwt.sign({ user_id: admin.user_id, role: admin.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user_id: admin.user_id,
          email: admin.email,
          username: admin.username,
          role: admin.role,
          token
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
};

module.exports = adminController;
