import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'zakinabdul.tecch@gmail.com',
        password: 'password123'
    });
    
    const { data, error } = await supabase.from('events').insert([
        {
            title: "Debug Event",
            slug: "debug-event-" + Date.now(),
            description: "Debugging",
            event_type: "online",
            location: "zoom.com",
            start_date: "2026-02-21",
            start_time: "10:00",
            capacity: 100,
            reminder_note: "",
            send_24h_reminder: true,
            confirmation_email_hours: 0,
            organizer_id: session?.user?.id || '00000000-0000-0000-0000-000000000000'
        }
    ]).select();
    
    console.log("Insert Result:", JSON.stringify(error || data, null, 2));
}
run();
