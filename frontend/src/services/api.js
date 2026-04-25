const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const buildHeaders = (token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
};

export const api = {
  register: async (body) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  login: async (body) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  getEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events`);
    return handleResponse(response);
  },

  createEvent: async (body, token) => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  deleteEvent: async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: "DELETE",
      headers: buildHeaders(token),
    });
    return handleResponse(response);
  },

  getEventAttendees: async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/attendees`, {
      headers: buildHeaders(token),
    });
    return handleResponse(response);
  },

  registerForEvent: async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: "POST",
      headers: buildHeaders(token),
    });
    return handleResponse(response);
  },

  unregisterFromEvent: async (eventId, token) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: "DELETE",
      headers: buildHeaders(token),
    });
    return handleResponse(response);
  },

  getMyRegistrations: async (token) => {
    const response = await fetch(`${API_BASE_URL}/me/registrations`, {
      headers: buildHeaders(token),
    });
    return handleResponse(response);
  },
};
