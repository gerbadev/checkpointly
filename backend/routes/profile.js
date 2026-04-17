const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  getProfileSummary,
  getProfileIdentity,
  updateProfileIdentity,
  updateProfileAvatar,
  resetUserData,
  deleteAccount,
  completeOnboarding,
} = require('../controllers/profileController');

const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    // Fallback based on mimetype.
    const fallbackExt =
      file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    cb(null, `${uuidv4()}${ext || fallbackExt}`);
  },
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('Invalid file type'));
    cb(null, true);
  },
});

router.get('/summary', auth, getProfileSummary);
router.get('/identity', auth, getProfileIdentity);
router.post('/identity', auth, updateProfileIdentity);
router.post('/onboarding/complete', auth, completeOnboarding);
router.post('/avatar', auth, avatarUpload.single('avatar'), updateProfileAvatar);
router.delete('/reset', auth, resetUserData);
router.delete('/account', auth, deleteAccount);


module.exports = router;
