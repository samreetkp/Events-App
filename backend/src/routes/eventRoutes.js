const express = require("express");
const { createEvent, getEvents, deleteEvent } = require("../controllers/eventController");
const { getEventAttendees } = require("../controllers/registrationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getEvents);
router.post("/", protect, authorize("department"), createEvent);
router.get("/:id/attendees", protect, authorize("department"), getEventAttendees);
router.delete("/:id", protect, authorize("department"), deleteEvent);

module.exports = router;
