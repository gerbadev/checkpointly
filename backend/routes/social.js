const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const authMiddleware = require('../middleware/authMiddleware');

// Sve rute ispod moraju biti autorizirane
router.use(authMiddleware);

router.post('/friends/request', socialController.sendFriendRequest);
router.put('/friends/accept/:id', socialController.acceptFriendRequest);
router.get('/friends', socialController.getFriends);
router.get('/leaderboard', socialController.getLeaderboard);
router.get('/users/:id', socialController.getPublicProfile);

// Habit sharing (invite/accept/decline -> copies habit + checkpoints)
router.post('/habit-shares/send', socialController.sendHabitShareInvitation);
router.get('/habit-shares/incoming', socialController.getIncomingHabitShareInvitations);
router.post('/habit-shares/:id/accept', socialController.acceptHabitShareInvitation);
router.post('/habit-shares/:id/decline', socialController.declineHabitShareInvitation);

module.exports = router;
