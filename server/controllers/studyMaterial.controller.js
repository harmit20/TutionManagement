const path = require('path');
const multer = require('multer');
const asyncHandler = require('../utils/asyncHandler');
const StudyMaterial = require('../models/StudyMaterial');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
const { audit } = require('../utils/audit');

// ─── Multer config (local disk; swap storage for S3 in prod) ─────────────────

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

exports.uploadMiddleware = upload.single('file');

const mimeToType = (mime) => {
  if (mime?.startsWith('image')) return 'image';
  if (mime?.startsWith('video')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime?.includes('word')) return 'doc';
  return 'other';
};

// ─── Upload ───────────────────────────────────────────────────────────────────

exports.uploadMaterial = asyncHandler(async (req, res) => {
  const { title, description, batchId, subject, isCacheable } = req.body;
  if (!title || !batchId) {
    return res.status(400).json({ message: 'title and batchId are required' });
  }

  // Support either a file upload or a URL link
  let fileUrl, fileName, fileSizeBytes, fileType;

  if (req.file) {
    fileUrl = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileSizeBytes = req.file.size;
    fileType = mimeToType(req.file.mimetype);
  } else if (req.body.fileUrl) {
    fileUrl = req.body.fileUrl;
    fileType = 'link';
  } else {
    return res.status(400).json({ message: 'Either a file or fileUrl is required' });
  }

  const material = await StudyMaterial.create({
    title,
    description,
    batch: batchId,
    subject,
    fileType,
    fileUrl,
    fileName,
    fileSizeBytes,
    uploadedBy: req.user._id,
    isCacheable: isCacheable !== 'false',
  });

  res.status(201).json(material);
});

// ─── List ─────────────────────────────────────────────────────────────────────

exports.listMaterials = asyncHandler(async (req, res) => {
  const { batchId, fileType, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: { $ne: true } };
  if (batchId) filter.batch = batchId;
  if (fileType) filter.fileType = fileType;

  const [materials, total] = await Promise.all([
    StudyMaterial.find(filter)
      .populate('uploadedBy', 'name')
      .populate('batch', 'name classLevel subject')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    StudyMaterial.countDocuments(filter),
  ]);

  res.json({ materials, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

exports.deleteMaterial = asyncHandler(async (req, res) => {
  const material = await StudyMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ message: 'Material not found' });

  // Only admin or the uploader can delete
  const isAdmin = req.user.role === 'admin';
  const isUploader = material.uploadedBy?.toString() === req.user._id.toString();
  if (!isAdmin && !isUploader) {
    return res.status(403).json({ message: 'Only the uploader or admin can delete this material' });
  }

  // Soft delete: hide from queries but keep the record (and the file) recoverable
  material.isDeleted = true;
  await material.save();

  audit(req, 'material.delete', 'StudyMaterial', material._id, { title: material.title });
  res.json({ message: 'Material deleted' });
});

// ─── Student (own batch materials) ───────────────────────────────────────────

exports.getMyMaterials = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });

  const materials = await StudyMaterial.find({ batch: { $in: profile.batches }, isDeleted: { $ne: true } })
    .populate('batch', 'name subject')
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });

  res.json(materials);
});

// Teacher: materials for assigned batches
exports.getMyBatchMaterials = asyncHandler(async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

  const materials = await StudyMaterial.find({ batch: { $in: profile.assignedBatches }, isDeleted: { $ne: true } })
    .populate('batch', 'name subject')
    .sort({ createdAt: -1 });

  res.json(materials);
});
