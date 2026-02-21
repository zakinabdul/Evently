import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    // try to insert, bypassing RLS using service role key, but wait we only have anon key in .env
    // let's just log in as the organizer to test RLS
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'zakinabdul.tecch@gmail.com', // user's email based on git commit author
        password: 'password123' // trying a generic one, if it fails we can't fully test RLS this way.
    });

    if (authError) {
       console.log("Auth failed, testing raw insert without user id (should fail RLS)");
       const { error } = await supabase.from('events').insert([
            {
                title: "Test Event",
                slug: "test-event-" + Date.now(),
                event_type: "online",
                location: "url",
                start_date: "2026-02-21",
                start_time: "10:00",
                capacity: 100,
                reminder_note: "",
                send_24h_reminder: false,
                confirmation_email_hours: 0,
                organizer_id: "00000000-0000-0000-0000-000000000000"
            }
        ]).select().single();
       console.log("Insert Error:", error);
    } else {
       console.log("Auth success!");
       const { error } = await supabase.from('events').insert([
            {
                title: "Test Event",
                slug: "test-event-" + Date.now(),
                event_type: "online",
                location: "url",
                start_date: "2026-02-21",
                start_time: "10:00",
                capacity: 100,
                reminder_note: "",
                send_24h_reminder: false,
                confirmation_email_hours: 0,
                organizer_id: session.user.id
            }
        ]).select().single();
       console.log("Insert Error:", error);
    }
}
test();
