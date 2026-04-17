const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  createHabit,
  getHabits,
  getHabit,
  getHabitProgress,
  completeCheckpoint,
  uncompleteCheckpoint,
  skipCheckpoint,
  deleteHabit,
  deleteAllHabits,
  regenerateCheckpoints,
  regenerateCheckpoint,
  getHabitCompletions,
  pauseHabit,
  resumeHabit,
  archiveHabit,
  unarchiveHabit,
  updateCheckpoint,
  addCheckpoint,
  deleteCheckpointFuture,
  reorderFutureCheckpoints,
  shareHabit,
} = require('../controllers/habitsController');

router.post('/', auth, createHabit);
router.get('/', auth, getHabits);
router.delete('/', auth, deleteAllHabits);

router.post('/checkpoint/:id/complete', auth, completeCheckpoint);
router.post('/checkpoint/:id/uncomplete', auth, uncompleteCheckpoint);
router.post('/checkpoint/:id/skip', auth, skipCheckpoint);
router.post('/checkpoint/:id/regenerate', auth, regenerateCheckpoint);

router.patch('/checkpoint/:id', auth, updateCheckpoint);
router.delete('/checkpoint/:id', auth, deleteCheckpointFuture);

router.post('/:id/checkpoints', auth, addCheckpoint);
router.post('/:id/checkpoints/reorder', auth, reorderFutureCheckpoints);

router.get('/:id/progress', auth, getHabitProgress);
router.post('/:id/regenerate-checkpoints', auth, regenerateCheckpoints);
router.get('/:id/completions', auth, getHabitCompletions);
router.post('/:id/share', auth, shareHabit);

router.post('/:id/pause', auth, pauseHabit);
router.post('/:id/resume', auth, resumeHabit);
router.post('/:id/archive', auth, archiveHabit);
router.post('/:id/unarchive', auth, unarchiveHabit);
router.get('/:id', auth, getHabit);
router.delete('/:id', auth, deleteHabit);

module.exports = router;
