const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { oauthLogin, me, completeOnboarding } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/oauth-login', oauthLogin);

router.get('/me', authMiddleware, me);
router.post('/onboarding/complete', authMiddleware, completeOnboarding);

module.exports = router;
