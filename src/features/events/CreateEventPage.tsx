
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthContext'

const createEventSchema = z.object({
    title: z.string().min(3, 'Title is required'),
    slug: z.string().min(3, 'Custom link must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed').optional().or(z.literal('')),
    description: z.string().optional(),
    event_type: z.enum(['online', 'in-person']),
    location: z.string().min(1, 'Location/Link is required'),
    start_date: z.string(),
    start_time: z.string(),
    capacity: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1, 'Capacity must be at least 1')),
    reminderNote: z.string().optional(),
    send24hReminder: z.boolean().default(false),
    requiresAttendanceConfirmation: z.boolean().default(false),
    confirmationEmailHours: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
})

type CreateEventForm = z.infer<typeof createEventSchema>

export function CreateEventPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateEventForm>({
        resolver: zodResolver(createEventSchema),
        defaultValues: {
            event_type: 'online',
            send24hReminder: false,
            requiresAttendanceConfirmation: false
        }
    })

    const eventType = watch('event_type')
    const requiresConfirmation = watch('requiresAttendanceConfirmation')

    const onSubmit = async (data: CreateEventForm) => {
        if (!user) return
        setLoading(true)
        setError(null)

        try {
            // Generate slug if empty
            let slug = data.slug
            if (!slug) {
                // Simple random slug
                slug = Math.random().toString(36).substring(2, 8)
            }

            // Extract and map fields
            const { reminderNote, send24hReminder, requiresAttendanceConfirmation, confirmationEmailHours, ...eventData } = data;

            const { error } = await supabase.from('events').insert([
                {
                    ...eventData,
                    reminder_note: reminderNote,
                    send_24h_reminder: send24hReminder,
                    confirmation_email_hours: requiresAttendanceConfirmation ? confirmationEmailHours : 0,
                    slug,
                    organizer_id: user.id
                }
            ]).select().single()

            if (error) throw error

            // Schedule Reminders automatically on creation
            if (send24hReminder) {
                try {
                    await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/email/schedule-reminders`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            eventData: {
                                ...eventData,
                                id: slug, // Approximation for the backend to use
                                title: eventData.title,
                                start_date: eventData.start_date,
                                start_time: eventData.start_time,
                                // Calculate exact local start datetime in UTC ISO string so the server doesn't offset it
                                local_start_iso: new Date(`${eventData.start_date}T${eventData.start_time}:00`).toISOString(),
                                location: eventData.location,
                                event_type: eventData.event_type,
                                meeting_link: eventData.location,
                                send_24h_reminder: send24hReminder
                            },
                            customMessage: reminderNote || ""
                        })
                    });
                } catch (apiError) {
                    console.error("Failed to schedule reminders:", apiError);
                }
            }

            navigate('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Failed to create event')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-10 animate-fade-in-up">
            <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Create New Event</h1>
                <p className="text-muted-foreground text-lg">Set up your next amazing experience.</p>
            </div>

            <div className="bg-card dark:bg-zinc-900/50 rounded-3xl border border-border shadow-xl overflow-hidden backdrop-blur-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="p-8 lg:p-10 space-y-8">
                    {/* Section: Basic Info */}
                    <div className="space-y-6 pb-8 border-b border-border">
                        <h2 className="text-xl font-bold tracking-tight text-primary">1. Basic Information</h2>
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label htmlFor="title" className="text-base font-semibold">Event Title</Label>
                                <Input id="title" placeholder="My Awesome Webinar" className="h-12 text-lg bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" {...register('title')} />
                                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="slug" className="text-base font-semibold">Custom Link (Optional)</Label>
                                <div className="flex items-center gap-2 bg-muted/50 rounded-md border border-transparent focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all">
                                    <span className="pl-4 text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">{window.location.host}/e/</span>
                                    <Input id="slug" placeholder="my-event-name" className="h-12 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 sm:pl-1" {...register('slug')} />
                                </div>
                                <p className="text-sm text-muted-foreground">Leave empty to generate a random short link.</p>
                                {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                                <textarea id="description" placeholder="A brief description of what to expect..." className="flex min-h-[120px] w-full rounded-md bg-muted/50 border-0 px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y" {...register('description')} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Time & Location */}
                    <div className="space-y-6 pb-8 border-b border-border">
                        <h2 className="text-xl font-bold tracking-tight text-primary">2. Time & Location</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label htmlFor="event_type" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Event Type</Label>
                                <select
                                    id="event_type"
                                    className="flex h-12 w-full rounded-md bg-muted/50 border-0 px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                                    {...register('event_type')}
                                >
                                    <option value="online">Online / Virtual</option>
                                    <option value="in-person">In-Person</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="location" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{eventType === 'online' ? 'Meeting Link' : 'Address'}</Label>
                                <Input id="location" placeholder={eventType === 'online' ? 'https://zoom.us/...' : '123 Main St'} className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" {...register('location')} />
                                {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="start_date" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
                                <Input id="start_date" type="date" className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" {...register('start_date')} />
                                {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="start_time" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Time</Label>
                                <Input id="start_time" type="time" className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" {...register('start_time')} />
                                {errors.start_time && <p className="text-sm text-red-500">{errors.start_time.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section: Attendees & Settings */}
                    <div className="space-y-6 pb-4">
                        <h2 className="text-xl font-bold tracking-tight text-primary">3. Attendees & Automations</h2>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="capacity" className="text-base font-semibold">Maximum Capacity</Label>
                                <Input id="capacity" type="number" placeholder="100" className="h-12 max-w-[200px] bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary text-xl font-bold" {...register('capacity')} />
                                {errors.capacity && <p className="text-sm text-red-500">{errors.capacity.message}</p>}
                            </div>

                            <div className="bg-muted/30 dark:bg-zinc-800/30 p-6 rounded-2xl border border-border space-y-6">
                                <div>
                                    <h3 className="font-semibold text-foreground mb-4 block">Email Reminders</h3>
                                    <div className="space-y-4">

                                        <label className="flex items-start space-x-3 cursor-pointer group">
                                            <div className="relative flex items-center pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="send24hReminder"
                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-primary/30 checked:border-primary checked:bg-primary transition-all"
                                                    {...register('send24hReminder')}
                                                />
                                                <svg className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-primary-foreground stroke-current stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground group-hover:text-primary transition-colors">Send standard 24-hour reminder email?</span>
                                                <p className="text-sm text-muted-foreground mt-0.5">Automatically sends a gentle reminder to all registrants exactly 24 hours before the event.</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start space-x-3 cursor-pointer group pt-2">
                                            <div className="relative flex items-center pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="requiresAttendanceConfirmation"
                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-primary/30 checked:border-primary checked:bg-primary transition-all"
                                                    {...register('requiresAttendanceConfirmation')}
                                                />
                                                <svg className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-primary-foreground stroke-current stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground group-hover:text-primary transition-colors">Schedule an Attendance Confirmation Request?</span>
                                                <p className="text-sm text-muted-foreground mt-0.5">Send a specific email asking attendees to actively confirm if they are still coming (Yes/No buttons).</p>
                                            </div>
                                        </label>

                                        {requiresConfirmation && (
                                            <div className="pl-8 pt-2 space-y-3 animate-fade-in-up">
                                                <Label htmlFor="confirmationEmailHours" className="text-sm font-medium text-primary">Hours before event to send request</Label>
                                                <div className="flex items-center gap-3">
                                                    <Input id="confirmationEmailHours" type="number" placeholder="48" className="h-10 max-w-[100px] border-primary/30 bg-primary/5 focus-visible:ring-primary" {...register('confirmationEmailHours')} />
                                                    <span className="text-sm text-muted-foreground">hours prior</span>
                                                </div>
                                                {errors.confirmationEmailHours && <p className="text-sm text-red-500">{errors.confirmationEmailHours.message}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border">
                                    <Label htmlFor="reminderNote" className="font-medium">Special instructions for attendees</Label>
                                    <textarea
                                        id="reminderNote"
                                        className="flex min-h-[100px] w-full rounded-md bg-background border border-border px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Bring your laptop, parking is available at the back lot..."
                                        {...register('reminderNote')}
                                    />
                                    <p className="text-sm text-muted-foreground">This note will be added to the confirmation and reminder emails automatically.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && <div className="p-4 bg-red-50/50 text-red-600 rounded-xl border border-red-100 backdrop-blur-sm">{error}</div>}

                    <div className="pt-6">
                        <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold rounded-xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-primary/40 disabled:hover:translate-y-0" disabled={loading}>
                            {loading ? 'Creating Experience...' : 'Create Event'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
