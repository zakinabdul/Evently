require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'zakinabdul.tecch@gmail.com',
        password: 'password123'
    });
    
    // If auth fails, try to insert without auth to see the exact column error (RLS error vs Column error)
    const { error } = await supabase.from('events').insert([
        {
            title: "Test Event",
            slug: "test-event-" + Date.now(),
            event_type: "online",
            location: "url",
            start_date: "2026-02-21",
            start_time: "10:00",
            capacity: 100,
            reminder_note: "test",
            send_24h_reminder: true,
            confirmation_email_hours: 0,
            organizer_id: session?.user?.id || '00000000-0000-0000-0000-000000000000'
        }
    ]);
    console.log("DB Insert result:", error || "Success");
}
run();
