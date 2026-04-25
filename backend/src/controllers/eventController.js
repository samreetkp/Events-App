const Event = require("../models/Event");
const Registration = require("../models/Registration");

const createEvent = async (req, res) => {
  try {
    const { title, description, date, location, capacity } = req.body;

    if (!title || !description || !date || !location || !capacity) {
      return res.status(400).json({ message: "All event fields are required." });
    }

    const eventDate = new Date(date);
    if (Number.isNaN(eventDate.getTime())) {
      return res.status(400).json({ message: "Invalid event date." });
    }

    if (eventDate <= new Date()) {
      return res.status(400).json({ message: "Event date must be in the future." });
    }

    const event = await Event.create({
      title,
      description,
      date: eventDate,
      location,
      capacity,
      departmentId: req.user._id,
    });

    return res.status(201).json(event);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create event." });
  }
};

const getEvents = async (_req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 }).lean();

    const eventsWithSpots = await Promise.all(
      events.map(async (event) => {
        const registrationCount = await Registration.countDocuments({ eventId: event._id });
        return {
          ...event,
          spotsRemaining: Math.max(event.capacity - registrationCount, 0),
        };
      })
    );

    return res.status(200).json(eventsWithSpots);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch events." });
  }
};

module.exports = { createEvent, getEvents };
