# AppointFlow End-to-End Workflow & Architecture 🚀

Welcome to the ultimate guide on how data and user interactions flow through the **AppointFlow** platform. This document traces the exact journey of both Event Organizers and Attendees, from landing on the homepage to receiving automated background emails.

---

## 1. Authentication & Onboarding Flow
**Goal:** Securely authenticate Event Organizers.

1. **Visit Landing Page / App Load:** Users land on the `AppointFlow` aesthetic home screen.
2. **Signup/Login (Supabase Auth):**
   * New users go to `/signup` and enter an email/password.
   * returning users go to `/login`.
   * The React frontend safely posts the credentials to the Supabase Authentication service.
3. **Session Establishment:** Upon success, Supabase returns a strict JWT token. The React context provider (`AuthContext.tsx`) detects this token, immediately unlocking the application and routing the user to the protected `/dashboard` view.

---

## 2. Event Organizer Workflow (The Dashboard)
**Goal:** Empower users to create and manage professional events instantly.

### A. Creating an Event
1. **The Form:** The Organizer clicks "Create Event" and fills out `CreateEventPage.tsx`. They define titles, capacities, times (`start_date` and `start_time`), locations, and advanced notification rules (like sending an automated check-in email 12 hours before).
2. **Database Insertion:** The React app securely writes (`INSERT`) this data directly into the Postgres `events` table via Supabase Row Level Security (RLS), asserting that the row's `organizer_id` matches their verified JWT token.
3. **Triggering Background Scheduling:** The moment the event saves to Postgres, the frontend hits the custom Node Express backend (`/api/email/schedule-reminders`). The backend instantly commands the **Inngest Workflow Engine** to sleep and wait until exactly `X` hours before the event to send automated emails.

### B. Tracking Analytics
1. **The Dashboard (`DashboardPage.tsx`):** The Organizer lands on an analytical dashboard.
2. **Live Data:** React dynamically queries Supabase for all events owned by `organizer_id`.
3. **Categorization Algorithm:** The dashboard engine actively checks the exact current minute against the event's `start_time`. Future events are boldly featured in the "Upcoming Events" grid, while finished events gracefully fall back into the "Past Events" archive. Capacity metrics and attendee sums update instantly.

---

## 3. Public Registration Workflow (The Attendee)
**Goal:** Allow public users to securely register for an Organizer's event.

1. **Event Deep-Link:** The Organizer shares a public, read-only URL containing a unique slug (e.g., `events/design-workshop-2026`).
2. **Live Validation (`RegisterEventPage.tsx`):**
   * The page fetches the event details.
   * It simultaneously checks `current_registrations` against `capacity` limits and enforces cutoff times (disabling the form if the event is sold out or already started).
3. **Registration:** The attendee submits their Name and Email. Postgres safely inserts this into the `registrations` table as `status='registered'`, bypassing RLS because of anonymous service-role overrides handled strictly by the frontend query parameters.
4. **Instant Welcome Email:** The frontend immediately triggers the Express Backend to send the beautiful `ConfirmationEmail.tsx` (built with React Email and Tailwind CSS) through the Brevo SMTP relays directly to the attendee's inbox.

---

## 4. Automated Engagement Workflow (Inngest Background Jobs)
**Goal:** Hands-free event management via intelligent background communication.

This is the most powerful layer of AppointFlow, running completely asynchronously on the backend `functions.ts` inside Inngest.

### Scenario A: The "Are you still coming?" Prompt
1. **The Sleep Timer:** If the Organizer required attendance confirmation (e.g., "12 Hours Before"), Inngest sleeps a background thread for weeks/months until exactly the 12-hour threshold hits.
2. **The Wake Up:** Inngest wakes up and dynamically fetches all 'active' emails from the `registrations` database.
3. **The Prompt (`AttendanceRequestEmail.tsx`):** It blasts an elegant email with large "Yes, I'm coming" and "No, I can't make it" buttons containing encrypted query parameters.
4. **The Resolution:** If an attendee clicks "No", the AppointFlow website seamlessly updates their Supabase status to `declined`, automatically lowering the `current_registrations` counter on the Organizer's dashboard to open up space!

### Scenario B: The 24-Hour Final Reminder
1. Exactly 24 hours before the exact `start_time`, Inngest wakes up again.
2. It filters out anyone who clicked "No" earlier, heavily reducing spam.
3. It sends a final, sleek `ReminderEmail.tsx` containing Google Maps directions or video meeting links natively formatted in the message.

---

## Technical Stack Recap

* **React (Vite):** The blazing-fast UI engine.
* **Tailwind CSS:** The modern styling framework enabling glassmorphism and animations.
* **Supabase:** The secure, real-time Postgres Database and Auth provider.
* **Inngest:** The incredibly reliable background queue/scheduling engine.
* **React Email:** Type-safe, React-based HTML email templates (`styles.ts`).
* **Brevo:** High-deliverability transactional email gateway.
* **VitePWA:** Seamlessly caches HTML/CSS/Google Fonts, allowing the app to run completely offline on Android/iOS like a native mobile app.
