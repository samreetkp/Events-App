import { useEffect, useMemo, useState } from "react";
import { api } from "./services/api";
import "./App.css";

const initialAuthForm = { name: "", email: "", password: "", role: "student" };
const initialEventForm = {
  title: "",
  description: "",
  date: "",
  endTime: "",
  location: "",
  capacity: 10,
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function App() {
  const [activeTopSection, setActiveTopSection] = useState("");
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [eventAttendees, setEventAttendees] = useState({});
  const [openAttendeesEventId, setOpenAttendeesEventId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isStudent = user?.role === "student";
  const isDepartment = user?.role === "department";

  const registeredEventIds = useMemo(
    () => new Set(myRegistrations.map((registration) => registration.eventId?._id)),
    [myRegistrations]
  );
  const upcomingEvents = useMemo(
    () => events.filter((eventItem) => new Date(eventItem.date) > new Date()),
    [events]
  );

  const loadEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const loadMyRegistrations = async (currentToken = token) => {
    if (!currentToken || !isStudent) return;
    try {
      const data = await api.getMyRegistrations(currentToken);
      setMyRegistrations(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const data = await api.getEvents();
        if (!cancelled) setEvents(data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchMyRegistrations = async () => {
      if (!token || !isStudent) {
        if (!cancelled) setMyRegistrations([]);
        return;
      }

      try {
        const data = await api.getMyRegistrations(token);
        if (!cancelled) setMyRegistrations(data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      }
    };

    fetchMyRegistrations();
    return () => {
      cancelled = true;
    };
  }, [token, isStudent]);

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const handleAuthSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const action = mode === "register" ? api.register : api.login;
      const payload = await action(authForm);

      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      setToken(payload.token);
      setUser(payload.user);
      setAuthForm(initialAuthForm);
      setMessage(`Welcome, ${payload.user.name}.`);
      await loadEvents();
      if (payload.user.role === "student") {
        await loadMyRegistrations(payload.token);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (submitEvent) => {
    submitEvent.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      await api.createEvent(eventForm, token);
      setEventForm(initialEventForm);
      setMessage("Event created successfully.");
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterForEvent = async (eventId) => {
    clearFeedback();
    setLoading(true);
    try {
      await api.registerForEvent(eventId, token);
      setMessage("Registered for event.");
      await Promise.all([loadEvents(), loadMyRegistrations(token)]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnregisterFromEvent = async (eventId) => {
    clearFeedback();
    setLoading(true);
    try {
      await api.unregisterFromEvent(eventId, token);
      setMessage("Unregistered from event.");
      await Promise.all([loadEvents(), loadMyRegistrations(token)]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;

    clearFeedback();
    setLoading(true);
    try {
      await api.deleteEvent(eventId, token);
      setMessage("Event deleted successfully.");
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendees = async (eventId) => {
    if (openAttendeesEventId === eventId) {
      setOpenAttendeesEventId("");
      return;
    }

    if (!eventAttendees[eventId]) {
      clearFeedback();
      setLoading(true);
      try {
        const attendees = await api.getEventAttendees(eventId, token);
        setEventAttendees((current) => ({ ...current, [eventId]: attendees }));
      } catch (requestError) {
        setError(requestError.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    setOpenAttendeesEventId(eventId);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setMyRegistrations([]);
    setMessage("Logged out.");
    setError("");
  };

  return (
    <main className="container">
      <header className="top-nav">
        <h1>UniEvents</h1>
        <nav>
          <button
            type="button"
            className={`nav-link-button ${activeTopSection === "about" ? "active" : ""}`}
            onClick={() =>
              setActiveTopSection((current) => (current === "about" ? "" : "about"))
            }
          >
            About
          </button>
          <button
            type="button"
            className={`nav-link-button ${activeTopSection === "auth" ? "active" : ""}`}
            onClick={() => setActiveTopSection((current) => (current === "auth" ? "" : "auth"))}
          >
            {user ? "Account" : "Login"}
          </button>
        </nav>
      </header>

      {activeTopSection === "about" && (
        <section id="about" className="panel">
          <h2>About</h2>
          <p>
            UniEvents helps students discover upcoming university events and register in seconds,
            while departments can publish and manage events in one place.
          </p>
        </section>
      )}

      {activeTopSection === "auth" && (
        <section id="auth" className="panel">
          {!user ? (
            <>
              <h2>{mode === "register" ? "Create Account" : "Login"}</h2>
              <form className="form" onSubmit={handleAuthSubmit}>
                {mode === "register" && (
                  <>
                    <label>Name</label>
                    <input
                      value={authForm.name}
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                  </>
                )}
                <label>Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
                <label>Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
                {mode === "register" && (
                  <>
                    <label>Role</label>
                    <select
                      value={authForm.role}
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, role: event.target.value }))
                      }
                    >
                      <option value="student">Student</option>
                      <option value="department">Department</option>
                    </select>
                  </>
                )}
                <button type="submit" disabled={loading}>
                  {mode === "register" ? "Register" : "Login"}
                </button>
              </form>
              <button
                className="secondary-button auth-toggle-button"
                onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
              >
                {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
              </button>
            </>
          ) : (
            <div className="row-between">
              <p>
                Signed in as <strong>{user.name}</strong> ({user.role})
              </p>
              <button className="secondary-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </section>
      )}

      {isDepartment && (
        <section className="panel">
          <h2>Create Event</h2>
          <form className="form" onSubmit={handleCreateEvent}>
            <label>Title</label>
            <input
              value={eventForm.title}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
            <label>Description</label>
            <textarea
              value={eventForm.description}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, description: event.target.value }))
              }
              required
            />
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={eventForm.date}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, date: event.target.value }))
              }
              required
            />
            <label>End Time</label>
            <input
              type="datetime-local"
              value={eventForm.endTime}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, endTime: event.target.value }))
              }
              required
            />
            <label>Location</label>
            <input
              value={eventForm.location}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, location: event.target.value }))
              }
              required
            />
            <label>Capacity</label>
            <input
              type="number"
              min="1"
              value={eventForm.capacity}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, capacity: Number(event.target.value) }))
              }
              required
            />
            <button type="submit" disabled={loading}>
              Create Event
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="row-between">
          <h2>Upcoming Events</h2>
        </div>
        {upcomingEvents.length === 0 ? (
          <p>No upcoming events yet.</p>
        ) : (
          <div className="event-list">
            {upcomingEvents.map((eventItem) => {
              const isRegistered = registeredEventIds.has(eventItem._id);
              const isFull = eventItem.spotsRemaining <= 0;
              const eventDepartmentId =
                typeof eventItem.departmentId === "object"
                  ? eventItem.departmentId?._id
                  : eventItem.departmentId;
              const isOwnerDepartment =
                isDepartment && String(eventDepartmentId) === String(user?.id);
              return (
                <article className="event-card" key={eventItem._id}>
                  <h3>{eventItem.title}</h3>
                  <p>{eventItem.description}</p>
                  <p>
                    <strong>Hosted by:</strong>{" "}
                    {eventItem.departmentName || eventItem.departmentId?.name || "Department"}
                  </p>
                  <p>
                    <strong>Date & Time:</strong> {formatDateTime(eventItem.date)} -{" "}
                    {eventItem.endTime ? formatDateTime(eventItem.endTime) : "TBD"}
                  </p>
                  <p>
                    <strong>Location:</strong> {eventItem.location}
                  </p>
                  <p>
                    <strong>Spots Remaining:</strong> {eventItem.spotsRemaining}
                  </p>
                  {isStudent && (
                    <>
                      {isRegistered ? (
                        <button disabled={loading} onClick={() => handleUnregisterFromEvent(eventItem._id)}>
                          Unregister
                        </button>
                      ) : (
                        <button
                          disabled={loading || isFull}
                          onClick={() => handleRegisterForEvent(eventItem._id)}
                        >
                          {isFull ? "Full" : "Register"}
                        </button>
                      )}
                    </>
                  )}
                  {isOwnerDepartment && (
                    <>
                      <button
                        className="secondary-button attendees-toggle-button"
                        disabled={loading}
                        onClick={() => handleToggleAttendees(eventItem._id)}
                      >
                        {openAttendeesEventId === eventItem._id ? "Hide Attendees" : "View Attendees"}
                      </button>
                      <button
                        className="danger-button"
                        disabled={loading}
                        onClick={() => handleDeleteEvent(eventItem._id)}
                      >
                        Delete Event
                      </button>
                    </>
                  )}
                  {isOwnerDepartment && openAttendeesEventId === eventItem._id && (
                    <div className="attendees-box">
                      <strong>Attendees</strong>
                      {eventAttendees[eventItem._id]?.length ? (
                        <ul className="attendees-list">
                          {eventAttendees[eventItem._id].map((attendee) => (
                            <li key={attendee.registrationId}>
                              {attendee.name} ({attendee.email})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No attendees yet.</p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isStudent && (
        <section className="panel">
          <h2>My Registrations</h2>
          {myRegistrations.length === 0 ? (
            <p>No registrations yet.</p>
          ) : (
            <ul className="registration-list">
              {myRegistrations.map((registration) => (
                <li key={registration._id}>
                  {registration.eventId?.title} -{" "}
                  {registration.eventId?.date
                    ? formatDateTime(registration.eventId.date)
                    : "Event deleted"}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </main>
  );
}

export default App;
