import { inngest } from "./client";
import { sendEmail } from "../lib/brevo";
import { ReminderEmail } from "../emails/ReminderEmail";
import { BroadcastEmail } from "../emails/BroadcastEmail";
import { AttendanceRequestEmail } from "../emails/AttendanceRequestEmail";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL_HERE";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_KEY_HERE";
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

export const sendCustomReminder = inngest.createFunction(
    { id: "send-custom-reminder" },
    { event: "event/reminder.custom" },
    async ({ event, step }: any) => {
        const { eventData, customMessage, timeBefore } = event.data;

        await step.run("calculate-send-time", async () => {
            console.log(`[Inngest] Scheduling custom reminder for event ${eventData.id}. Will send ${timeBefore} hours before ${eventData.start_date} ${eventData.start_time}`);
        });

        // Parse event datetime
        const eventDateStr = `${eventData.start_date}T${eventData.start_time}:00`;
        const eventDate = new Date(eventDateStr);

        // Subtract hours
        const sendDate = new Date(eventDate.getTime() - (timeBefore * 60 * 60 * 1000));

        // Sleep until that time
        await step.sleepUntil("wait-for-custom-reminder-time", sendDate);

        // Fetch current registrants right before sending
        const registrants = await step.run("fetch-registrants", async () => {
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('event_id', eventData.id)
                .eq('status', 'registered');
            // Only send to confirmed 'registered' users, not 'cancelled'

            if (error) {
                console.error("Failed to fetch registrants for custom reminder", error);
                return [];
            }
            return data || [];
        });

        if (!registrants || registrants.length === 0) {
            console.log(`[Inngest] No active registrants found for custom reminder (event ${eventData.id})`);
            return { count: 0 };
        }

        await step.run("send-custom-emails", async () => {
            const emailPromises = registrants.map(async (registrant: any) => {
                const emailHtml = render(ReminderEmail({
                    registrantName: registrant.full_name,
                    eventTitle: eventData.title,
                    eventDate: eventData.start_date,
                    eventTime: eventData.start_time,
                    location: eventData.location,
                    isOnline: eventData.event_type === 'online',
                    meetingLink: eventData.meeting_link,
                    daysUntilEvent: `${timeBefore} hours`,
                    customMessage: customMessage,
                    registrationId: registrant.id,
                    frontendUrl: FRONTEND_URL // Will be the newly defined frontendUrl
                }));

                return sendEmail({
                    to: registrant.email,
                    subject: `Reminder: ${eventData.title} starts in ${timeBefore} hours`,
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

        // Parse event datetime. Assumes eventData.start_date is YYYY-MM-DD and start_time is HH:MM
        const eventDateStr = `${eventData.start_date}T${eventData.start_time}:00`;
        const eventDate = new Date(eventDateStr);

        // Subtract hours
        const sendDate = new Date(eventDate.getTime() - (eventData.confirmation_email_hours * 60 * 60 * 1000));

        // Sleep until that time
        await step.sleepUntil("wait-for-confirmation-time", sendDate);

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
