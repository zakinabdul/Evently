import { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2, Mail, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from 'sonner';

interface EmailsTabProps {
    eventId: string;
    eventTitle: string;
}

export function EmailsTab({ eventId, eventTitle }: EmailsTabProps) {
    const [stats, setStats] = useState({
        sent: 0,
        openRate: 0,
        scheduled: 0
    });
    const [loading, setLoading] = useState(false);

    // Broadcast State
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [registrantCount, setRegistrantCount] = useState(0);

    // Event Settings State (Moved up to fix Hook Error #300)
    const [eventSettings, setEventSettings] = useState<any>(null);

    useEffect(() => {
        // Fetch event settings
        supabase.from('events').select('send_24h_reminder, confirmation_email_hours').eq('id', eventId).single()
            .then(({ data }) => {
                if (data) setEventSettings(data);
            });

        // Fetch registrant count for broadcast estimate & sent count proxy
        const fetchCount = async () => {
            const { count } = await supabase
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', eventId);

            setRegistrantCount(count || 0);

            // Update stats based on real data where possible
            setStats({
                sent: count || 0, // Approx: 1 confirmation per registrant
                openRate: 0, // Placeholder until webhook analytics are added
                scheduled: 0 // Will be calculated in render
            });
        };
        fetchCount();
    }, [eventId]);

    const handleSendBroadcast = async () => {
        if (!subject || !body) return;
        setSending(true);

        try {
            // Need to fetch registrants to send them to backend (or backend can fetch)
            // Better for backend to fetch to ensure consistency and security
            // We'll just pass eventId to backend.

            // Get registrants first to confirm (optional, could just send eventId)
            const { data: registrants } = await supabase
                .from('registrations')
                .select('id, email, full_name')
                .eq('event_id', eventId);

            if (!registrants || registrants.length === 0) {
                toast.error("No registrants to email yet.");
                return;
            }

            // Updated endpoint to /send-update to avoid ad-blockers
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/email/send-update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId,
                    eventTitle,
                    subject,
                    htmlBody: body,
                    registrants
                })
            });

            if (!response.ok) throw new Error("Failed to send broadcast");

            toast.success("Broadcast queued successfully!");
            setShowBroadcast(false);
            setSubject("");
            setBody("");
        } catch (error) {
            toast.error("Failed to queue broadcast: " + error);
        } finally {
            setSending(false);
        }
    };

    if (showBroadcast) {
        return (
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Send Email Update</CardTitle>
                    <CardDescription>Send a message to all {registrantCount} registered attendees.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Subject Line</Label>
                        <Input
                            placeholder="Important update about..."
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Message Body</Label>
                        <div className="bg-white rounded-md text-black">
                            <ReactQuill theme="snow" value={body} onChange={setBody} className="h-64 mb-12" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setShowBroadcast(false)}>Cancel</Button>
                    <Button onClick={handleSendBroadcast} disabled={sending || !subject || !body}>
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {sending ? "Sending..." : `Send to ${registrantCount} People`}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // Determine scheduled emails based on props/state (fetching event details here or passed down)
    // For now assuming we need to fetch event settings to know if 24h is enabled.
    // In a real app, pass `eventSettings` as prop.
    // We will show a static list based on what we know for now or just generic info.
    // Actually, let's fetch event details to show accurate scheduled status.


    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.sent}</div>
                        <p className="text-xs text-muted-foreground">Total sent</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.openRate}%</div>
                        <p className="text-xs text-muted-foreground">Average engagement</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(eventSettings?.send_24h_reminder ? 1 : 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Upcoming reminders</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={() => setShowBroadcast(true)}>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email Update
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Scheduled Emails</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {eventSettings?.send_24h_reminder && (
                            <div className="flex items-center justify-between border-b pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <div className="bg-primary/10 p-2 rounded-full w-fit">
                                        <Clock className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">24-Hour Reminder</p>
                                        <p className="text-sm text-muted-foreground">Scheduled for 1 day before event</p>
                                    </div>
                                </div>
                                <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded whitespace-nowrap">Active</span>
                            </div>
                        )}



                        {eventSettings?.confirmation_email_hours > 0 && (
                            <div className="flex items-center justify-between border-b pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <div className="bg-primary/10 p-2 rounded-full w-fit">
                                        <Clock className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Attendance Confirmation Request</p>
                                        <p className="text-sm text-muted-foreground">Scheduled for {eventSettings.confirmation_email_hours} hours before event</p>
                                    </div>
                                </div>
                                <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded whitespace-nowrap">Active</span>
                            </div>
                        )}

                        {!eventSettings?.send_24h_reminder && (!eventSettings?.confirmation_email_hours || eventSettings?.confirmation_email_hours === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-4">No reminders scheduled.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
