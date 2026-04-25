# University Events Management and Registration System

Starter full-stack MVP for:
- User register/login
- Department creates events
- Student views events
- Student registers for an event
- Student sees registered events

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

## Backend Setup

1. Copy env file:
   - `cp backend/.env.example backend/.env`
2. Update `backend/.env`:
   - `MONGO_URI`
   - `JWT_SECRET`
3. Run backend:
   - `cd backend`
   - `npm run dev`

API base URL: `http://localhost:5000/api`

## Frontend Setup

1. Optional: create `frontend/.env`:
   - `VITE_API_URL=http://localhost:5000/api`
2. Run frontend:
   - `cd frontend`
   - `npm run dev`

## MVP Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/events`
- `POST /api/events` (department only)
- `POST /api/events/:id/register` (student only)
- `GET /api/me/registrations` (student only)
