const Event = require("../models/Event");
const Registration = require("../models/Registration");

const registerForEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const existingRegistration = await Registration.findOne({
      eventId,
      studentId: req.user._id,
    });
    if (existingRegistration) {
      return res.status(409).json({ message: "You are already registered for this event." });
    }

    const registrationCount = await Registration.countDocuments({ eventId });
    if (registrationCount >= event.capacity) {
      return res.status(409).json({ message: "Event is at full capacity." });
    }

    const registration = await Registration.create({
      eventId,
      studentId: req.user._id,
    });

    return res.status(201).json(registration);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You are already registered for this event." });
    }
    return res.status(500).json({ message: "Registration failed." });
  }
};

const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ studentId: req.user._id })
      .populate("eventId")
      .sort({ createdAt: -1 });

    return res.status(200).json(registrations);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch registrations." });
  }
};

module.exports = { registerForEvent, getMyRegistrations };
