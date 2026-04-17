const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const rewardsController = require("../controllers/rewardsController");

router.use(authMiddleware);

router.get("/daily-chest", rewardsController.getDailyChest);
router.post("/daily-chest/claim", rewardsController.claimDailyChest);
router.post("/streak-freeze/confirm", rewardsController.confirmStreakFreeze);

module.exports = router;
