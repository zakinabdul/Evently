import express from 'express';
import { inngest } from '../inngest/client';
import { sendEmail } from '../lib/brevo';
import { render } from '@react-email/components';
import { ConfirmationEmail } from '../emails/ConfirmationEmail';

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// 1. CONFIRMATION EMAIL (Immediate)
router.post('/confirm', async (req, res) => {
    try {
        const { registrantName, registrantEmail, eventDetails, registrationId } = req.body;

        // Generate AI Welcome Message
        let aiMessage = "";
        try {
            const prompt = `Generate a short, warm, and professional welcome message for an attendee named ${registrantName} registering for the event "${eventDetails.title}".
            Event Description: ${eventDetails.description || 'No description provided.'}
            Context: They just registered. Mention clearly that their registration is confirmed.
            Keep it under 50 words. Plain text only, no markdown.`;

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 100
                })
            });

            const data = await response.json();
            aiMessage = data.choices[0]?.message?.content || "";
        } catch (groqError) {
            console.error("Groq generation failed:", groqError);
            // Fallback not needed, template handles empty string or default
        }

        const emailHtml = render(ConfirmationEmail({
            registrantName,
            eventTitle: eventDetails.title,
            eventDate: eventDetails.start_date,
            eventTime: eventDetails.start_time,
            location: eventDetails.location,
            isOnline: eventDetails.event_type === 'online',
            meetingLink: eventDetails.meeting_link,
            registrationId,
            frontendUrl: FRONTEND_URL,
            aiWelcomeMessage: aiMessage,
        }));

        const data = await sendEmail({
            to: registrantEmail,
            subject: `Registration Confirmed: ${eventDetails.title}`,
            html: emailHtml
        });

        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Confirmation Email Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. BROADCAST EMAIL (Renamed to /send-update to avoid ad-blockers)
router.post('/send-update', async (req, res) => {
    try {
        const { eventId, eventTitle, subject, htmlBody, registrants } = req.body;
        console.log(`[Email Route] Received update request for event "${eventTitle}" with ${registrants?.length} registrants.`);

        const result = await inngest.send({
            name: "event/broadcast",
            data: {
                eventId,
                eventTitle,
                subject,
                htmlBody,
                registrants
            }
        });

        console.log(`[Email Route] Update event sent to Inngest. IDs: ${JSON.stringify(result)}`);

        res.json({ success: true, message: "Broadcast queued", result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. SCHEDULE ATTENDANCE REQUEST
router.post('/schedule-attendance-request', async (req, res) => {
    try {
        const { eventData, registrant, frontendUrl } = req.body;
        console.log(`[Email Route] Scheduling attendance request for event "${eventData.title}" for ${registrant.email}.`);

        const result = await inngest.send({
            name: "event/registration.created",
            data: {
                eventData,
                registrant,
                frontendUrl
            }
        });

        res.json({ success: true, message: "Attendance request scheduled", result });
    } catch (error: any) {
        console.error("[Email Route] Failed to schedule attendance request:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3.5 SCHEDULE EVENT REMINDERS (Custom and 24h)
router.post('/schedule-reminders', async (req, res) => {
    try {
        const { eventData, customMessage, timeBefore } = req.body;
        console.log(`[Email Route] Scheduling reminders for event "${eventData.title}". Custom msg: ${!!customMessage}, Time before: ${timeBefore}`);

        const results = [];

        // 1. Schedule Custom Reminder if requested
        if (customMessage && timeBefore) {
            results.push(await inngest.send({
                name: "event/reminder.custom",
                data: {
                    eventData,
                    customMessage,
                    timeBefore,
                    // Note: registrants need to be fetched dynamically by the Inngest function
                    // at the time of execution, not passed here, otherwise new registrants miss it.
                }
            }));
        }

        res.json({ success: true, message: "Reminders scheduled", results });
    } catch (error: any) {
        console.error("[Email Route] Failed to schedule reminders:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. AI GENERATION (Groq) - Removed template gen, using inline for welcome now
// Keeping generic endpoint if needed for other things
router.post('/generate-template', async (req, res) => {
    try {
        const { eventName, eventType, date, time, description, notes } = req.body;
        const prompt = `Generate a professional, friendly reminder email for an event called "${eventName}". 
        It is a ${eventType} event happening on ${date} at ${time}. 
        Description: ${description}. 
        Things attendees should know or bring: ${notes}. 
        Keep it concise, warm, and action-oriented under 200 words. 
        Return only the email body HTML, no subject line, no html/head tags, just the body content div/p tags.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500
            })
        });

        const data = await response.json();
        const generatedText = data.choices[0]?.message?.content || "";

        // Clean up markdown code blocks if present
        const cleanHtml = generatedText.replace(/```html/g, '').replace(/```/g, '');

        res.json({ success: true, html: cleanHtml });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. ATTENDANCE TRACKING (Simple GET)
router.get('/attendance/confirm', (req, res) => {
    // In a real app, you would verify logic here using Supabase Admin client
    // For now, we'll just redirect to a frontend page that handles the status update via useEffect
    // OR we return a simple HTML success page.

    // Let's redirect to frontend to handle the DB update
    const { id, status } = req.query;
    res.redirect(`${FRONTEND_URL}/attendance-confirmed?id=${id}&status=${status}`);
});

// 5. RESEND WEBHOOK
router.post('/webhook', (req, res) => {
    const event = req.body;
    console.log("Resend Webhook:", event);
    // Logic to update open rates in DB would go here
    res.status(200).send();
});

export default router;
