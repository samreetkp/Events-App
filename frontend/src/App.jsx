import { useEffect, useMemo, useState } from "react";
import { api } from "./services/api";
import "./App.css";

const initialAuthForm = { name: "", email: "", password: "", role: "student" };
const initialAccountForm = { name: "", email: "", password: "" };
const initialEventForm = {
  title: "",
  description: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  photo: "",
  location: "",
  capacity: "10",
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDateOnly = (value) =>
  new Date(value).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const MAX_EVENT_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const toDateInputValue = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const toTimeInputValue = (value) => {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};
const combineDateAndTime = (dateValue, timeValue) => `${dateValue}T${timeValue}`;

function App() {
  const [activeTopSection, setActiveTopSection] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState("");
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [accountForm, setAccountForm] = useState(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return initialAccountForm;
    const parsed = JSON.parse(stored);
    return { name: parsed.name || "", email: parsed.email || "", password: "" };
  });
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [hiddenRegistrationIds, setHiddenRegistrationIds] = useState([]);
  const [eventAttendees, setEventAttendees] = useState({});
  const [openAttendeesEventId, setOpenAttendeesEventId] = useState("");
  const [editingEventId, setEditingEventId] = useState("");
  const [editEventForm, setEditEventForm] = useState(initialEventForm);
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [registrationInfoEvent, setRegistrationInfoEvent] = useState(null);
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
  const filteredUpcomingEvents = useMemo(() => {
    return upcomingEvents.filter((eventItem) => {
      const matchesEventName = eventItem.title
        ?.toLowerCase()
        .includes(eventSearchTerm.trim().toLowerCase());
      const matchesDepartment = (eventItem.departmentName || eventItem.departmentId?.name || "")
        .toLowerCase()
        .includes(departmentSearchTerm.trim().toLowerCase());
      const matchesDate = dateFilter ? formatDateOnly(eventItem.date) === dateFilter : true;

      return matchesEventName && matchesDepartment && matchesDate;
    });
  }, [upcomingEvents, eventSearchTerm, departmentSearchTerm, dateFilter]);
  const displayedUpcomingEvents = useMemo(() => {
    if (!isDepartment) return filteredUpcomingEvents;

    return filteredUpcomingEvents.filter((eventItem) => {
      const eventDepartmentId =
        typeof eventItem.departmentId === "object" ? eventItem.departmentId?._id : eventItem.departmentId;
      return String(eventDepartmentId) === String(user?.id);
    });
  }, [filteredUpcomingEvents, isDepartment, user?.id]);

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
      setHiddenRegistrationIds([]);
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

  useEffect(() => {
    if (!message && !error) return undefined;

    const timeoutId = setTimeout(() => {
      setMessage("");
      setError("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [message, error]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const parseCapacity = (capacityValue) => {
    const parsed = Number(capacityValue);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error("Capacity must be a whole number greater than 0.");
    }
    return parsed;
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
      setActiveTopSection("");
      setMobileActiveSection("");
      setIsMobileMenuOpen(false);
      setAccountForm({ name: payload.user.name, email: payload.user.email, password: "" });
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
      if (!eventForm.eventDate || !eventForm.startTime || !eventForm.endTime) {
        throw new Error("Date, start time, and end time are required.");
      }
      const payload = {
        ...eventForm,
        date: combineDateAndTime(eventForm.eventDate, eventForm.startTime),
        endTime: combineDateAndTime(eventForm.eventDate, eventForm.endTime),
        capacity: parseCapacity(eventForm.capacity),
      };
      delete payload.eventDate;
      delete payload.startTime;
      await api.createEvent(payload, token);
      setEventForm(initialEventForm);
      setMessage("Event created successfully.");
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventPhotoChange = (changeEvent) => {
    clearFeedback();
    const file = changeEvent.target.files?.[0];
    if (!file) {
      setEventForm((current) => ({ ...current, photo: "" }));
      return;
    }
    if (file.size > MAX_EVENT_PHOTO_SIZE_BYTES) {
      setError("Event photo must be 5MB or smaller.");
      changeEvent.target.value = "";
      setEventForm((current) => ({ ...current, photo: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEventForm((current) => ({ ...current, photo: typeof reader.result === "string" ? reader.result : "" }));
    };
    reader.readAsDataURL(file);
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

  const handleStartEditEvent = (eventItem) => {
    setEditingEventId(eventItem._id);
    setEditEventForm({
      title: eventItem.title || "",
      description: eventItem.description || "",
      eventDate: toDateInputValue(eventItem.date),
      startTime: toTimeInputValue(eventItem.date),
      endTime: eventItem.endTime ? toTimeInputValue(eventItem.endTime) : "",
      photo: eventItem.photo || "",
      location: eventItem.location || "",
      capacity: String(eventItem.capacity || "1"),
    });
  };

  const handleCancelEditEvent = () => {
    setEditingEventId("");
    setEditEventForm(initialEventForm);
  };

  const handleEditEventPhotoChange = (changeEvent) => {
    clearFeedback();
    const file = changeEvent.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_EVENT_PHOTO_SIZE_BYTES) {
      setError("Event photo must be 5MB or smaller.");
      changeEvent.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditEventForm((current) => ({
        ...current,
        photo: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditEventSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editingEventId) return;
    clearFeedback();
    setLoading(true);
    try {
      if (!editEventForm.eventDate || !editEventForm.startTime || !editEventForm.endTime) {
        throw new Error("Date, start time, and end time are required.");
      }
      const payload = {
        ...editEventForm,
        date: combineDateAndTime(editEventForm.eventDate, editEventForm.startTime),
        endTime: combineDateAndTime(editEventForm.eventDate, editEventForm.endTime),
        capacity: parseCapacity(editEventForm.capacity),
      };
      delete payload.eventDate;
      delete payload.startTime;
      await api.updateEvent(editingEventId, payload, token);
      setMessage("Event updated successfully.");
      setEditingEventId("");
      setEditEventForm(initialEventForm);
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

  const handleShowRegistrationInfo = (registration) => {
    const event = registration.eventId;
    if (!event) {
      setError("Event details are not available.");
      return;
    }
    setRegistrationInfoEvent(event);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setAccountForm(initialAccountForm);
    setActiveTopSection("");
    setMobileActiveSection("");
    setIsMobileMenuOpen(false);
    setMyRegistrations([]);
    setMessage("Logged out.");
    setError("");
  };

  const handleGoHome = () => {
    window.location.assign("/");
  };

  const handleUpdateAccount = async (submitEvent) => {
    submitEvent.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const payload = {
        name: accountForm.name,
      };
      if (accountForm.password) {
        payload.password = accountForm.password;
      }

      const response = await api.updateProfile(payload, token);
      const updatedUser = response.user;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setAccountForm((current) => ({ ...current, password: "" }));
      setMessage("Account settings updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearEventFilters = () => {
    setEventSearchTerm("");
    setDepartmentSearchTerm("");
    setDateFilter("");
  };

  const handleCloseRegistrationInfo = () => {
    setRegistrationInfoEvent(null);
  };

  const openMobileSection = (section) => {
    setMobileActiveSection((current) => (current === section ? "" : section));
    setIsMobileMenuOpen(false);
  };

  const showAboutSection = isMobileView ? mobileActiveSection === "about" : activeTopSection === "about";
  const showAuthSection = isMobileView ? mobileActiveSection === "auth" : activeTopSection === "auth";
  const showMobileRegistrationsOnly = isMobileView && mobileActiveSection === "registrations" && isStudent;
  const showMobileCreateEventOnly = isMobileView && mobileActiveSection === "create-event" && isDepartment;
  const hideMainContentForMobileMenu = isMobileView && mobileActiveSection !== "";

  return (
    <main className="container">
      {(message || error) && (
        <div className={`toast-message ${error ? "toast-error" : "toast-success"}`}>
          {error || message}
        </div>
      )}
      {registrationInfoEvent && (
        <div className="modal-overlay" onClick={handleCloseRegistrationInfo}>
          <div className="info-modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{registrationInfoEvent.title || "Event Details"}</h3>
            <p>
              <strong>Date & Time:</strong>{" "}
              {registrationInfoEvent.date ? formatDateTime(registrationInfoEvent.date) : "N/A"}
              {" - "}
              {registrationInfoEvent.endTime ? formatDateTime(registrationInfoEvent.endTime) : "TBD"}
            </p>
            <p>
              <strong>Location:</strong> {registrationInfoEvent.location || "N/A"}
            </p>
            <p>
              <strong>Hosted by:</strong> {registrationInfoEvent.departmentName || "Department"}
            </p>
            <p>
              <strong>Description:</strong> {registrationInfoEvent.description || "N/A"}
            </p>
            <button type="button" className="secondary-button" onClick={handleCloseRegistrationInfo}>
              Close
            </button>
          </div>
        </div>
      )}
      <header className="top-nav">
        <button type="button" className="brand-button" onClick={handleGoHome}>
          UniEvents
        </button>
        {isMobileView ? (
          <div className="mobile-menu-wrapper">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              <span />
              <span />
              <span />
            </button>
            {isMobileMenuOpen && (
              <div className="mobile-menu-dropdown">
                <button type="button" className="nav-link-button" onClick={() => openMobileSection("about")}>
                  About
                </button>
                <button type="button" className="nav-link-button" onClick={() => openMobileSection("auth")}>
                  {user ? "Account" : "Login"}
                </button>
                {isStudent && (
                  <button
                    type="button"
                    className="nav-link-button"
                    onClick={() => openMobileSection("registrations")}
                  >
                    My Registrations
                  </button>
                )}
                {isDepartment && (
                  <button
                    type="button"
                    className="nav-link-button"
                    onClick={() => openMobileSection("create-event")}
                  >
                    Create Event
                  </button>
                )}
                {user && (
                  <button type="button" className="nav-link-button" onClick={handleLogout}>
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
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
            {user && (
              <button type="button" className="nav-link-button" onClick={handleLogout}>
                Logout
              </button>
            )}
          </nav>
        )}
      </header>

      {showAboutSection && (
        <section id="about" className="panel">
          <h2>About</h2>
          <p>
            UniEvents helps students discover upcoming university events and register in seconds,
            while departments can publish and manage events in one place.
          </p>
        </section>
      )}

      {showAuthSection && (
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
              <p className="auth-toggle-text">
                {mode === "login" ? "Need an account?" : "Already have an account?"}
              </p>
              <button
                className="secondary-button auth-toggle-button"
                onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
              >
                {mode === "login" ? "Register" : "Login"}
              </button>
            </>
          ) : (
            <>
              <div className="row-between">
                <p>
                  Signed in as <strong>{user.name}</strong> ({user.role})
                </p>
                <button className="secondary-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
              <h3>Account Settings</h3>
              <form className="form" onSubmit={handleUpdateAccount}>
                <label>Name</label>
                <input
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
                <label>Email</label>
                <input
                  type="email"
                  className="read-only-input"
                  value={accountForm.email}
                  readOnly
                />
                <label>New Password (optional)</label>
                <input
                  type="password"
                  value={accountForm.password}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Leave blank to keep current password"
                />
                <button type="submit" disabled={loading}>
                  Save Account Changes
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {showMobileRegistrationsOnly && (
        <section className="panel registrations-panel">
          <h2>My Registrations</h2>
          {myRegistrations.filter((registration) => !hiddenRegistrationIds.includes(registration._id))
            .length === 0 ? (
            <p>No registrations yet.</p>
          ) : (
            <ul className="registration-list">
              {myRegistrations
                .filter((registration) => !hiddenRegistrationIds.includes(registration._id))
                .map((registration) => (
                <li key={registration._id}>
                  <div className="registration-row">
                    <span>
                      {registration.eventId?.title} -{" "}
                      {registration.eventId?.date
                        ? formatDateTime(registration.eventId.date)
                        : "Event deleted"}
                    </span>
                    <div className="registration-actions">
                      <button
                        type="button"
                        disabled={loading || !registration.eventId?._id}
                        onClick={() =>
                          registration.eventId?._id &&
                          handleUnregisterFromEvent(registration.eventId._id)
                        }
                      >
                        Unregister
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleShowRegistrationInfo(registration)}
                      >
                        More Info
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {showMobileCreateEventOnly && (
        <section className="panel create-event-panel">
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
              type="date"
              value={eventForm.eventDate}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, eventDate: event.target.value }))
              }
              required
            />
            <label>Start Time</label>
            <input
              type="time"
              value={eventForm.startTime}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, startTime: event.target.value }))
              }
              required
            />
            <label>End Time</label>
            <input
              type="time"
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
            <label>Event Photo</label>
            <input type="file" accept="image/*" onChange={handleEventPhotoChange} />
            <label>Capacity</label>
            <input
              type="number"
              min="1"
              value={eventForm.capacity}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, capacity: event.target.value }))
              }
              required
            />
            <button type="submit" disabled={loading}>
              Create Event
            </button>
          </form>
        </section>
      )}

      {!hideMainContentForMobileMenu && !user && (
        <p className="login-register-hint">Login to register for events.</p>
      )}
      {!hideMainContentForMobileMenu && (
      <div
        className={`events-layout ${isStudent ? "student-events-layout" : ""} ${
          isDepartment && !isStudent ? "department-events-layout" : ""
        }`}
      >
        {isStudent && !isMobileView && (
          <section className="panel registrations-panel">
            <h2>My Registrations</h2>
            {myRegistrations.filter((registration) => !hiddenRegistrationIds.includes(registration._id))
              .length === 0 ? (
              <p>No registrations yet.</p>
            ) : (
              <ul className="registration-list">
                {myRegistrations
                  .filter((registration) => !hiddenRegistrationIds.includes(registration._id))
                  .map((registration) => (
                  <li key={registration._id}>
                    <div className="registration-row">
                      <span>
                        {registration.eventId?.title} -{" "}
                        {registration.eventId?.date
                          ? formatDateTime(registration.eventId.date)
                          : "Event deleted"}
                      </span>
                      <div className="registration-actions">
                        <button
                          type="button"
                          disabled={loading || !registration.eventId?._id}
                          onClick={() =>
                            registration.eventId?._id &&
                            handleUnregisterFromEvent(registration.eventId._id)
                          }
                        >
                          Unregister
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleShowRegistrationInfo(registration)}
                        >
                          More Info
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="panel upcoming-events-panel">
          <div className="row-between">
            <h2>{isDepartment ? "Department Upcoming Events" : "Upcoming Events"}</h2>
          </div>
          {isStudent && (
            <div className="event-filter-grid">
              <input
                type="text"
                placeholder="Search by event name"
                value={eventSearchTerm}
                onChange={(event) => setEventSearchTerm(event.target.value)}
              />
              <input
                type="text"
                placeholder="Search by department name"
                value={departmentSearchTerm}
                onChange={(event) => setDepartmentSearchTerm(event.target.value)}
              />
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              <button
                type="button"
                className="secondary-button clear-filters-button"
                onClick={handleClearEventFilters}
              >
                Clear Filters
              </button>
            </div>
          )}
          {displayedUpcomingEvents.length === 0 ? (
            <p>No upcoming events yet.</p>
          ) : (
            <div className="event-list">
              {displayedUpcomingEvents.map((eventItem) => {
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
                    <div className="event-card-header">
                      <h3>{eventItem.title}</h3>
                      {isOwnerDepartment && (
                        <button
                          className="secondary-button top-right-edit-button"
                          disabled={loading}
                          onClick={() =>
                            editingEventId === eventItem._id
                              ? handleCancelEditEvent()
                              : handleStartEditEvent(eventItem)
                          }
                        >
                          {editingEventId === eventItem._id ? "Cancel Edit" : "Edit Event"}
                        </button>
                      )}
                    </div>
                    {eventItem.photo && (
                      <img className="event-photo" src={eventItem.photo} alt={`${eventItem.title} event`} />
                    )}
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
                          <button
                            className="upcoming-unregister-button"
                            disabled={loading}
                            onClick={() => handleUnregisterFromEvent(eventItem._id)}
                          >
                            Unregister
                          </button>
                        ) : (
                          <button
                            className="event-register-button"
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
                    {isOwnerDepartment && editingEventId === eventItem._id && (
                      <form className="form edit-event-form" onSubmit={handleEditEventSubmit}>
                        <label>Title</label>
                        <input
                          value={editEventForm.title}
                          onChange={(event) =>
                            setEditEventForm((current) => ({ ...current, title: event.target.value }))
                          }
                          required
                        />
                        <label>Description</label>
                        <textarea
                          value={editEventForm.description}
                          onChange={(event) =>
                            setEditEventForm((current) => ({ ...current, description: event.target.value }))
                          }
                          required
                        />
                        <label>Date</label>
                        <input
                          type="date"
                          value={editEventForm.eventDate}
                          onChange={(event) =>
                            setEditEventForm((current) => ({ ...current, eventDate: event.target.value }))
                          }
                          required
                        />
                        <label>Start Time</label>
                        <input
                          type="time"
                          value={editEventForm.startTime}
                          onChange={(event) =>
                            setEditEventForm((current) => ({ ...current, startTime: event.target.value }))
                          }
                          required
                        />
                        <label>End Time</label>
                        <input
                          type="time"
                          value={editEventForm.endTime}
                          onChange={(event) =>
                            setEditEventForm((current) => ({ ...current, endTime: event.target.value }))
                          }
                          required
                        />
                        <label>Location</label>
                        <input
                          value={editEventForm.location}
                          onChange={(event) =>
                            setEditEventForm((current) => ({ ...current, location: event.target.value }))
                          }
                          required
                        />
                        <label>Event Photo</label>
                        <input type="file" accept="image/*" onChange={handleEditEventPhotoChange} />
                        <label>Capacity</label>
                        <input
                          type="number"
                          min="1"
                          value={editEventForm.capacity}
                          onChange={(event) =>
                            setEditEventForm((current) => ({ ...current, capacity: event.target.value }))
                          }
                          required
                        />
                        <button type="submit" disabled={loading}>
                          Save Changes
                        </button>
                      </form>
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
        {isDepartment && !isMobileView && (
          <section className="panel create-event-panel">
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
                type="date"
                value={eventForm.eventDate}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, eventDate: event.target.value }))
                }
                required
              />
              <label>Start Time</label>
              <input
                type="time"
                value={eventForm.startTime}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, startTime: event.target.value }))
                }
                required
              />
              <label>End Time</label>
              <input
                type="time"
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
              <label>Event Photo</label>
              <input type="file" accept="image/*" onChange={handleEventPhotoChange} />
              <label>Capacity</label>
              <input
                type="number"
                min="1"
                value={eventForm.capacity}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, capacity: event.target.value }))
                }
                required
              />
              <button type="submit" disabled={loading}>
                Create Event
              </button>
            </form>
          </section>
        )}
      </div>
      )}

    </main>
  );
}

export default App;
