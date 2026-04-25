# UniEvents

UniEvents is a full-stack university event management app where departments create/manage events and students discover/register/unregister from upcoming events.

## Features

- JWT authentication with role-based access (`student` and `department`)
- Department event management:
  - Create events (title, description, date, start/end time, location, capacity, optional photo)
  - Edit and delete only events created by that department
  - View attendee list (name and email) for owned events
- Student event experience:
  - Browse upcoming events
  - Search/filter by event name, department name, and date
  - Register and unregister from events
  - View "My Registrations" with a details modal
- Capacity protections:
  - No duplicate registrations
  - No registration beyond event capacity
- Responsive UI:
  - Fixed top header with navigation
  - Mobile menu and role-based layout behavior
- Auto-dismissing toast feedback for success/error actions

## Project Structure

```text
Events-App/
  backend/
    src/
      app.js
      server.js
      config/db.js
      controllers/
      middleware/
      models/
      routes/
    .env.example
    package.json
  frontend/
    src/
      App.jsx
      App.css
      index.css
      services/api.js
    package.json
```

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcryptjs

## Backend Setup

1. Copy env file:
   - `cp backend/.env.example backend/.env`
2. Update `backend/.env`:
   - `PORT` (default in this project is `5001`)
   - `MONGO_URI`
   - `JWT_SECRET`
3. Run backend:
   - `cd backend`
   - `npm run dev`

API base URL (local): `http://localhost:5001/api`

## Frontend Setup

1. Create/update `frontend/.env`:
   - `VITE_API_URL=http://localhost:5001/api`
2. Run frontend:
   - `cd frontend`
   - `npm run dev`

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `PUT /api/auth/me` (protected)

### Events

- `GET /api/events`
- `POST /api/events` (protected, department only)
- `PUT /api/events/:id` (protected, department owner only)
- `DELETE /api/events/:id` (protected, department owner only)
- `GET /api/events/:id/attendees` (protected, department owner only)

### Registrations

- `POST /api/events/:id/register` (protected, student only)
- `DELETE /api/events/:id/register` (protected, student only)
- `GET /api/me/registrations` (protected, student only)

## Deployment Notes

- Backend (Render): ensure `MONGO_URI`, `JWT_SECRET`, and `PORT` are set.
- Frontend (Vercel): set `VITE_API_URL` to your deployed backend API URL and include `/api`.
  - Example: `https://your-backend.onrender.com/api`

## Live Deployment URLs

- Frontend (Vercel): `https://events-app-delta-one.vercel.app`
- Backend (Render): `https://events-app-4mz5.onrender.com`
- Frontend environment value: `VITE_API_URL=https://events-app-4mz5.onrender.com/api`

