import { useEffect, useMemo, useState } from "react";
import { api } from "./services/api";
import "./App.css";

const initialAuthForm = { name: "", email: "", password: "", role: "student" };
const initialEventForm = {
  title: "",
  description: "",
  date: "",
  location: "",
  capacity: 10,
};

function App() {
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isStudent = user?.role === "student";
  const isDepartment = user?.role === "department";

  const registeredEventIds = useMemo(
    () => new Set(myRegistrations.map((registration) => registration.eventId?._id)),
    [myRegistrations]
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
      <h1>UniEvents</h1>

      <section className="panel">
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
              className="secondary-button"
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
            <label>Date</label>
            <input
              type="datetime-local"
              value={eventForm.date}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, date: event.target.value }))
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
          <button className="secondary-button" onClick={loadEvents}>
            Refresh
          </button>
        </div>
        {events.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          <div className="event-list">
            {events.map((eventItem) => {
              const isRegistered = registeredEventIds.has(eventItem._id);
              const isFull = eventItem.spotsRemaining <= 0;
              const isOwnerDepartment =
                isDepartment && String(eventItem.departmentId) === String(user?.id);
              return (
                <article className="event-card" key={eventItem._id}>
                  <h3>{eventItem.title}</h3>
                  <p>{eventItem.description}</p>
                  <p>
                    <strong>Date:</strong> {new Date(eventItem.date).toLocaleString()}
                  </p>
                  <p>
                    <strong>Location:</strong> {eventItem.location}
                  </p>
                  <p>
                    <strong>Spots Remaining:</strong> {eventItem.spotsRemaining}
                  </p>
                  {isStudent && (
                    <button
                      disabled={loading || isRegistered || isFull}
                      onClick={() => handleRegisterForEvent(eventItem._id)}
                    >
                      {isRegistered ? "Already Registered" : isFull ? "Full" : "Register"}
                    </button>
                  )}
                  {isOwnerDepartment && (
                    <button
                      className="danger-button"
                      disabled={loading}
                      onClick={() => handleDeleteEvent(eventItem._id)}
                    >
                      Delete Event
                    </button>
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
                    ? new Date(registration.eventId.date).toLocaleString()
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
