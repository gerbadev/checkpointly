const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

router.get('/summary', auth, getDashboardSummary);

module.exports = router;
