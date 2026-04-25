const Event = require("../models/Event");
const Registration = require("../models/Registration");

const createEvent = async (req, res) => {
  try {
    const { title, description, date, endTime, location, capacity } = req.body;

    if (!title || !description || !date || !endTime || !location || !capacity) {
      return res.status(400).json({ message: "All event fields are required." });
    }

    const eventDate = new Date(date);
    const eventEndTime = new Date(endTime);
    if (Number.isNaN(eventDate.getTime())) {
      return res.status(400).json({ message: "Invalid event date." });
    }
    if (Number.isNaN(eventEndTime.getTime())) {
      return res.status(400).json({ message: "Invalid event end time." });
    }

    if (eventDate <= new Date()) {
      return res.status(400).json({ message: "Event date must be in the future." });
    }
    if (eventEndTime <= eventDate) {
      return res.status(400).json({ message: "Event end time must be after start time." });
    }

    const event = await Event.create({
      title,
      description,
      date: eventDate,
      endTime: eventEndTime,
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

const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (String(event.departmentId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only delete events you created." });
    }

    await Registration.deleteMany({ eventId: event._id });
    await Event.deleteOne({ _id: event._id });

    return res.status(200).json({ message: "Event deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete event." });
  }
};

module.exports = { createEvent, getEvents, deleteEvent };
