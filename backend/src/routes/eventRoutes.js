const express = require("express");
const { createEvent, getEvents } = require("../controllers/eventController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getEvents);
router.post("/", protect, authorize("department"), createEvent);

module.exports = router;
