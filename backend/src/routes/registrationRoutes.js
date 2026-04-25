const express = require("express");
const {
  registerForEvent,
  getMyRegistrations,
} = require("../controllers/registrationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/events/:id/register", protect, authorize("student"), registerForEvent);
router.get("/me/registrations", protect, authorize("student"), getMyRegistrations);

module.exports = router;
