# AppointFlow

AppointFlow is a premium, state-of-the-art event management and registration platform. With a stunning "Luminous Minimal" design, it allows organizers to easily create events, accept registrations, and automate email workflows (like attendance confirmations and custom reminders) using Inngest and Brevo.

## Features

- **Modern & Beautiful UI**: Built with React, TailwindCSS, and Shadcn UI, featuring glassmorphism, dynamic typography, and sleek animations.
- **Event Creation & Management**: Seamlessly configure online or in-person events with custom slugs and capacities.
- **Automated Email Reminders**: Integration with Inngest background jobs to send custom scheduled reminders and 24-hour notifications.
- **Attendance Confirmation**: An intelligent scheduling system that asks attendees to confirm their attendance a customizable number of hours before the event.
- **Dashboard Analytics**: Real-time insights into registration trends, email open rates, and broadcast histories.

## Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS, Shadcn UI, Vanilla CSS (`index.css`)
- **Routing**: React Router DOM
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend & Infrastructure
- **API**: Node.js / Express (TypeScript)
- **Database / Auth**: Supabase (PostgreSQL)
- **Background Jobs**: Inngest
- **Email Delivery**: Brevo (formerly Sendinblue) & React Email

---

## Running Locally

To set up AppointFlow on your local machine, follow these instructions. 

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [Supabase](https://supabase.com/) account
- A [Brevo](https://www.brevo.com/) account
- An [Inngest](https://www.inngest.com/) account
- A [Groq](https://groq.com/) account (optional, for AI welcome messages)

### 1. Clone the repository

```bash
git clone https://github.com/zakinabdul/Evently.git
cd Evently
```

### 2. Install dependencies

Install dependencies for the frontend and backend simultaneously:

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
cd ..
```

### 3. Setup Environment Variables

**Frontend (`.env` in the root folder):**
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:3001
```

**Backend (`backend/.env`):**
```env
PORT=3001
# Email
BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=your_verified_sender_email@domain.com
SENDER_NAME="AppointFlow Notifications"

# Inngest (Background Jobs)
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Supabase (for dynamic registrant fetching in backend)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq (AI text generation - Optional)
GROQ_API_KEY=your_groq_api_key

FRONTEND_URL=http://localhost:5173
```

### 4. Database Setup

To use the application, you'll need the necessary tables in Supabase (`profiles`, `events`, `registrations`). 

A complete database migration file is provided in the root of the repository.
1. Go to your Supabase project dashboard.
2. Navigate to the **SQL Editor**.
3. Create a new query, paste the contents of the `database_setup.sql` file included in this repository, and hit **Run**.
This will instantly create all tables, establish the proper foreign key relationships, and set up Row Level Security (RLS) policies needed for the application to function.

### 5. Start the Development Servers

Open **three** separate terminal windows.

**Terminal 1: Frontend (Vite)**
```bash
npm run dev
```

**Terminal 2: Backend (Express)**
```bash
cd backend
npm run dev
```

**Terminal 3: Inngest Dev Server**
```bash
npx inngest-cli@latest dev
```
*(The Inngest CLI orchestrates the scheduled background jobs locally on `http://localhost:8288`)*

### 6. Access the Application

- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Inngest Dashboard**: `http://localhost:8288`

---

## Deployment

- **Frontend**: Recommended deployment on Vercel. Connect the GitHub repository and ensure the build command is `npm run build` and output directory is `dist`. Add the necessary Frontend environment variables in Vercel.
- **Backend**: Can be hosted on platforms like Render or Heroku. In the deployment settings, configure the build command as `npm run build` inside the `backend/` directory, and start command as `npm start`. Set the corresponding backend environment variables.
- **Inngest**: Link your GitHub repository in the Inngest Platform to automatically sync your background functions (`functions.ts`) upon every push to the `main` branch.

## License
MIT License.
