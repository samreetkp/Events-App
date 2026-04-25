const Event = require("../models/Event");
const Registration = require("../models/Registration");
const User = require("../models/User");

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

const getEventAttendees = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (String(event.departmentId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only view attendees for your own events." });
    }

    const registrations = await Registration.find({ eventId }).select("studentId createdAt").lean();
    const studentIds = registrations.map((registration) => registration.studentId);
    const students = await User.find({ _id: { $in: studentIds } }).select("name email").lean();
    const studentById = new Map(students.map((student) => [String(student._id), student]));

    const attendees = registrations
      .map((registration) => {
        const student = studentById.get(String(registration.studentId));
        if (!student) return null;
        return {
          registrationId: registration._id,
          name: student.name,
          email: student.email,
        };
      })
      .filter(Boolean);

    return res.status(200).json(attendees);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch attendees." });
  }
};

module.exports = { registerForEvent, getMyRegistrations, getEventAttendees };
