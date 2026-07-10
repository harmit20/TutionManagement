const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const { audit } = require('../utils/audit');

// ─── Token helpers ────────────────────────────────────────────────────────────

const signAccess = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const userPayload = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// ─── Controllers ─────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  // Constant-time: always run comparePassword even on miss to prevent timing attacks
  const valid = user ? await user.comparePassword(password) : false;

  if (!valid || !user?.isActive) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = signAccess(user._id, user.role);
  const refreshToken = signRefresh(user._id);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  res.json({ accessToken, user: userPayload(user) });
};

exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });

  try {
    const { id } = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(id);

    if (!user || !user.isActive) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'User not found or deactivated' });
    }

    res.json({ accessToken: signAccess(user._id, user.role) });
  } catch {
    res.clearCookie('refreshToken');
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken', COOKIE_OPTS);
  res.json({ message: 'Logged out' });
};

exports.getMe = (req, res) => {
  const u = req.user;
  res.json({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });
};

/**
 * Admin-only: create a user + their role profile atomically.
 * If profile creation fails, the user document is rolled back.
 */
exports.createUser = async (req, res) => {
  const { name, email, password, role, phone, ...profileData } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, and role are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  // New accounts belong to the creator's branch (null = default centre)
  const user = await User.create({ name, email, passwordHash: password, role, phone, centre: req.user.centre ?? null });

  try {
    if (role === 'student') {
      const { enrollmentNumber, classLevel, parentName, parentPhone, address, dateOfBirth } = profileData;
      if (!enrollmentNumber || !classLevel) {
        throw Object.assign(new Error('enrollmentNumber and classLevel are required for students'), { status: 400 });
      }
      await StudentProfile.create({ user: user._id, enrollmentNumber, classLevel, parentName, parentPhone, address, dateOfBirth });
    } else if (role === 'teacher') {
      await TeacherProfile.create({ user: user._id, ...profileData });
    } else if (role === 'parent' && profileData.childStudentIds?.length) {
      await StudentProfile.updateMany(
        { _id: { $in: profileData.childStudentIds } },
        { parentUser: user._id }
      );
    }
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    return res.status(err.status || 500).json({ message: err.message });
  }

  audit(req, 'user.create', 'User', user._id, { role, email });
  res.status(201).json({ user: userPayload(user) });
};

/**
 * Admin-only: update a user's basic fields and active status.
 */
exports.updateUser = async (req, res) => {
  const { name, phone, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, phone, isActive },
    { new: true, runValidators: true }
  );

  if (!user) return res.status(404).json({ message: 'User not found' });
  audit(req, isActive === false ? 'user.deactivate' : 'user.update', 'User', user._id, { name, phone, isActive });
  res.json({ user: userPayload(user) });
};

/**
 * Admin-only: change a user's password.
 */
exports.changePassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'newPassword must be at least 8 characters' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.passwordHash = newPassword; // pre-save hook re-hashes
  await user.save();

  audit(req, 'user.changePassword', 'User', user._id);
  res.json({ message: 'Password updated' });
};
