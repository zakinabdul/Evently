import { inngest } from "./client";
import { sendEmail } from "../lib/brevo";
import { ReminderEmail } from "../emails/ReminderEmail";
import { BroadcastEmail } from "../emails/BroadcastEmail";
import { AttendanceRequestEmail } from "../emails/AttendanceRequestEmail";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

export const send24hrReminder = inngest.createFunction(
    { id: "send-24hr-reminder" },
    { event: "event/reminder.24hr" },
    async ({ event, step }: any) => {
        const { eventData, registrants } = event.data;

        // Check if 24h reminder is enabled for this event
        if (!eventData.send_24h_reminder) {
            console.log(`[Inngest] 24h reminder skipped for event ${eventData.id} (disabled by organizer)`);
            return { skipped: true };
        }

        await step.run("send-emails-batch", async () => {
            const emailPromises = registrants.map(async (registrant: any) => {
                const emailHtml = render(ReminderEmail({
                    registrantName: registrant.full_name,
                    eventTitle: eventData.title,
                    eventDate: eventData.date, // Formatted already
                    eventTime: eventData.time,
                    location: eventData.location,
                    isOnline: eventData.event_type === 'online',
                    meetingLink: eventData.meeting_link,
                    daysUntilEvent: "24 hours",
                    registrationId: registrant.id,
                    frontendUrl: FRONTEND_URL
                }));

                return sendEmail({
                    to: registrant.email,
                    subject: `Reminder: ${eventData.title} is tomorrow!`,
                    html: emailHtml
                });
            });

            await Promise.all(emailPromises);
            return { count: registrants.length };
        });
    }
);

export const sendBroadcastEmail = inngest.createFunction(
    { id: "send-broadcast-email" },
    { event: "event/broadcast" },
    async ({ event, step }: any) => {
        const { eventTitle, subject, htmlBody, registrants } = event.data;
        console.log(`[Inngest] Starting broadcast email job for "${eventTitle}". Recipients: ${registrants?.length}`);

        const BATCH_SIZE = 50;

        for (let i = 0; i < registrants.length; i += BATCH_SIZE) {
            const batch = registrants.slice(i, i + BATCH_SIZE);

            await step.run(`send-batch-${i}`, async () => {
                console.log(`[Inngest] Processing batch ${i}...`);
                const promises = batch.map(async (registrant: any) => {
                    try {
                        const emailHtml = render(BroadcastEmail({
                            registrantName: registrant.full_name,
                            eventTitle: eventTitle,
                            subject: subject,
                            htmlBody: htmlBody,
                            registrationId: registrant.id,
                            frontendUrl: FRONTEND_URL
                        }));

                        const result = await sendEmail({
                            to: registrant.email,
                            subject: subject,
                            html: emailHtml
                        });
                        console.log(`[Inngest] Email sent to ${registrant.email}. MessageId: ${result.messageId}`);
                        return result;
                    } catch (error) {
                        console.error(`[Inngest] Failed to send email to ${registrant.email}:`, error);
                        throw error;
                    }
                });

                await Promise.all(promises);
            });

            await step.sleep("wait-1s", "1s");
        }
    }
);

export const scheduleAttendanceRequest = inngest.createFunction(
    { id: "schedule-attendance-request" },
    { event: "event/registration.created" },
    async ({ event, step }: any) => {
        const { eventData, registrant, frontendUrl } = event.data;

        // Wait until it's time to send the confirmation email
        // Wait Time = Event Start Time - X Hours

        await step.run("calculate-send-time", async () => {
            console.log(`[Inngest] Registered for event ${eventData.id}. Will send confirmation request ${eventData.confirmation_email_hours} hours before ${eventData.start_date} ${eventData.start_time}`);
        });

        // Parse event datetime robustly
        let eventDateStr = `${eventData.start_date}T${eventData.start_time}:00`;
        // if the date is just YYYY-MM-DD there is no timezone component, JS will assume local time.
        // It's safer to explicitly treat it as standard ISO
        let eventDate = new Date(eventDateStr);
        if (isNaN(eventDate.getTime())) {
            // Fallback parsing strategy if standard ISO parsing failed
            eventDate = new Date(`${eventData.start_date} ${eventData.start_time}`);
        }

        let sendDate = new Date(); // fallback to 'now'

        // Ensure confirmation_email_hours is a number
        const hoursBefore = Number(eventData.confirmation_email_hours) || 0;

        if (!isNaN(eventDate.getTime()) && hoursBefore > 0) {
            // Subtract hours
            sendDate = new Date(eventDate.getTime() - (hoursBefore * 60 * 60 * 1000));
        }

        // Failsafe: if sendDate is for some reason still invalid, or is in the past, sleepUntil skips it.
        // But if the Date object is literally 'Invalid Date', Inngest throws an error.
        if (isNaN(sendDate.getTime()) || sendDate.getTime() < Date.now()) {
            console.log(`[Inngest] Send date is invalid or in the past (${sendDate}). Skipping sleep.`);
            // No sleep, will execute immediately
        } else {
            // Sleep until that time
            await step.sleepUntil("wait-for-confirmation-time", sendDate);
        }

        // Send the email
        await step.run("send-attendance-request-email", async () => {
            const emailHtml = render(AttendanceRequestEmail({
                registrantName: registrant.full_name,
                eventTitle: eventData.title,
                eventDate: eventData.start_date,
                eventTime: eventData.start_time,
                location: eventData.location,
                isOnline: eventData.event_type === 'online',
                meetingLink: eventData.meeting_link,
                hoursBefore: eventData.confirmation_email_hours,
                registrationId: registrant.id,
                frontendUrl: frontendUrl || FRONTEND_URL
            }));

            return sendEmail({
                to: registrant.email,
                subject: `Action Required: Are you still coming to ${eventData.title}?`,
                html: emailHtml
            });
        });
    }
);
