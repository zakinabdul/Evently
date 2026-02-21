# AppointFlow (Evently)

A modern, full-stack event registration and management platform inspired by state-of-the-art SaaS designs. Built with React, Vite, Tailwind CSS, Supabase, and Inngest.

## Features

- **Sleek UI/UX:** Luminous Minimalist design with glassmorphism and modern typography (Outfit/Inter).
- **Authentication:** Split-screen authentication flows for login and signup.
- **Dashboard:** Comprehensive dashboard with real-time analytics.
- **Event Management:** Create and manage online or in-person events.
- **Automated Emails:** Background jobs driven by Inngest to send 24-hr reminders and attendance confirmation requests.
- **Database:** Supabase Postgres with robust Row Level Security (RLS) policies.

## Tech Stack
- Frontend: React 18, Vite, Tailwind CSS, shadcn/ui
- Backend (Email Triggers): Node.js, Express, Inngest
- Database & Auth: Supabase
- Email Delivery: Brevo

## Running Locally

To run this project locally, you will need concurrently running instances of the frontend, backend, Inngest Dev Server, and a Supabase project.

### 1. Prerequisites
- Node.js (v18+)
- A Supabase Project (for Postgres Database and Authentication)
- A Brevo Account (for sending emails)
- An Inngest Account (for background jobs)

### 2. Environment Variables

**Frontend (`.env`)**
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:3001
```

**Backend (`backend/.env`)**
Create a `.env` file in the `backend/` directory:
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
BREVO_API_KEY=your_brevo_api_key
```

### 3. Database Setup
We have provided the initialization SQL script inside the `sql/` directory.
1. Open your Supabase Dashboard.
2. Go to the **SQL Editor**.
3. Paste the contents of `sql/database_setup.sql` and click **Run`.

### 4. Installation & Start

1. **Install Frontend Dependencies:**
```bash
npm install
```

2. **Install Backend Dependencies:**
```bash
cd backend
npm install
```

3. **Run the application:**
You will need three terminal windows:

**Terminal 1: Frontend**
```bash
npm run dev
```

**Terminal 2: Backend**
```bash
cd backend
npm run dev
```

**Terminal 3: Inngest Dev Server**
```bash
npx inngest-cli@latest dev
```

The app will be available at `http://localhost:5173`.
