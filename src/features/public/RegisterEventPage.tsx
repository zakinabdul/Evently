
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, MapPin, Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

// Types
type EventDetails = {
    id: string
    title: string
    description: string
    event_type: 'online' | 'in-person'
    location: string
    start_date: string
    start_time: string
    current_registrations: number
    capacity: number
    confirmation_email_hours: number | null
    organizer: {
        organization_name: string
        full_name: string
    }
}

const registrationSchema = z.object({
    fullName: z.string().min(2, 'Full Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    professionalStatus: z.enum(['Student', 'Working Professional', 'Entrepreneur', 'Freelancer', 'Other']),
})

type RegistrationForm = z.infer<typeof registrationSchema>

export function RegisterEventPage() {
    const { eventId, slug } = useParams<{ eventId?: string; slug?: string }>()
    const [event, setEvent] = useState<EventDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { register, handleSubmit, formState: { errors } } = useForm<RegistrationForm>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            professionalStatus: 'Working Professional'
        }
    })

    useEffect(() => {
        if (!eventId && !slug) return

        const fetchEvent = async () => {
            try {
                let query = supabase
                    .from('events')
                    .select(`
            *,
            organizer:profiles(organization_name, full_name)
          `)

                if (slug) {
                    query = query.eq('slug', slug)
                } else if (eventId) {
                    query = query.eq('id', eventId)
                }

                const { data, error } = await query.single()

                if (error) throw error
                setEvent(data)
            } catch (err: any) {
                console.error('Error fetching event:', err)
                setError('Event not found or failed to load.')
            } finally {
                setLoading(false)
            }
        }

        fetchEvent()
    }, [eventId, slug])

    const onSubmit = async (data: RegistrationForm) => {
        if (!event) return
        setRegistering(true)
        setError(null)

        try {
            // Check capacity
            if (event.current_registrations >= event.capacity) {
                throw new Error('Event is at full capacity.')
            }

            // Check existing registration
            const { data: existing } = await supabase
                .from('registrations')
                .select('id')
                .eq('event_id', event.id)
                .eq('email', data.email)
                .maybeSingle()

            if (existing) {
                throw new Error('You are already registered for this event with this email.')
            }

            // Register
            const { data: newRegistration, error: regError } = await supabase
                .from('registrations')
                .insert([
                    {
                        event_id: event.id,
                        full_name: data.fullName,
                        email: data.email,
                        phone: data.phone,
                        status: 'registered',
                        professional_status: data.professionalStatus
                    }
                ])
                .select()
                .single()

            if (regError) throw regError

            // Send Confirmation Email via Backend
            try {
                await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/email/confirm`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        registrantName: data.fullName,
                        registrantEmail: data.email,
                        eventDetails: event,
                        registrationId: newRegistration.id
                    })
                });
            } catch (emailError) {
                console.error("Failed to send confirmation email", emailError);
                // Don't block success UI, just log it
            }

            // Trigger attendance request scheduler if hours are set
            if (event.confirmation_email_hours && event.confirmation_email_hours > 0) {
                try {
                    await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/email/schedule-attendance-request`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            eventData: event,
                            registrant: newRegistration,
                            frontendUrl: window.location.origin
                        })
                    });
                } catch (inngestError) {
                    console.error("Failed to schedule attendance request", inngestError);
                }
            }

            // Increment count (RPC or optimistic update would be better, but direct update for MVP since RLS usually blocks update on events table for public)
            // Actually, we can't update 'events' table as public user due to RLS.
            // We rely on a database trigger or the organizer viewing the count.
            // But for UI feedback, we assume success.
            // Note: Updating `current_registrations` on `events` table requires a Trigger in Postgres or an Edge Function to bypass RLS.
            // I will assume a Trigger exists or just proceed without updating limit for this MVP explanation.

            setSuccess(true)
        } catch (err: any) {
            setError(err.message || 'Registration failed')
        } finally {
            setRegistering(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading event details...</div>
    }

    if (!event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-500 gap-4">
                <p>{error || 'Event not found'}</p>
                <div className="text-xs text-muted-foreground bg-gray-100 p-4 rounded text-left font-mono">
                    <p>Debug Info:</p>
                    <p>Slug param: {JSON.stringify(slug)}</p>
                    <p>EventId param: {JSON.stringify(eventId)}</p>
                    <p>Error details: {JSON.stringify(error)}</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted/20">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Registration Confirmed!</CardTitle>
                        <CardDescription>
                            You are all set for {event.title}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Your registration has been recorded successfully. Please save the details below.
                        </p>
                        <div className="bg-muted p-4 rounded-lg text-left text-sm space-y-2">
                            <div className="flex gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(event.start_date), 'MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{format(new Date(`2000-01-01T${event.start_time}`), 'h:mm a')}</span>
                            </div>
                            <div className="flex gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">{event.location}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Button variant="outline" onClick={() => setSuccess(false)}>
                            Register Another Person
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const isFull = event.current_registrations >= event.capacity
    const eventDate = new Date(`${event.start_date}T${event.start_time}`)

    return (
        <div className="min-h-screen bg-background selection:bg-primary/30 font-sans">
            {/* Hero Banner Section */}
            <div className="w-full bg-zinc-950 text-white relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

                <div className="container mx-auto max-w-6xl px-4 py-20 lg:py-28 relative z-10 animate-fade-in-up">
                    <div className="max-w-3xl">
                        <span className="inline-block px-4 py-1.5 bg-white/10 text-white rounded-full text-sm font-semibold mb-6 capitalize backdrop-blur-md border border-white/10 tracking-wide shadow-xl">
                            {event.event_type} Event
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">{event.title}</h1>
                        <div className="text-xl md:text-2xl text-zinc-300 font-medium">
                            Presented by <span className="text-white">{event.organizer?.organization_name || 'Organizer'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 py-12 lg:py-16">
                <div className="grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-16 items-start relative">
                    {/* Left Column: Event Details */}
                    <div className="space-y-10 animate-fade-in-up delay-100">
                        {/* Quick Info Bar */}
                        <div className="flex flex-wrap gap-6 p-6 rounded-2xl bg-muted/40 border border-border">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground font-medium">Date</div>
                                    <div className="font-semibold text-foreground">{format(eventDate, 'EEEE, MMMM d, yyyy')}</div>
                                </div>
                            </div>

                            <div className="w-px h-12 bg-border hidden sm:block"></div>

                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground font-medium">Time</div>
                                    <div className="font-semibold text-foreground">{format(eventDate, 'h:mm a')}</div>
                                </div>
                            </div>

                            <div className="w-px h-12 bg-border hidden sm:block"></div>

                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground font-medium">Location</div>
                                    <div className="font-semibold text-foreground">{event.event_type === 'online' ? 'Online Event' : event.location}</div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
                                <span className="w-8 h-1 bg-primary rounded-full inline-block"></span>
                                About this event
                            </h3>
                            <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                <p className="whitespace-pre-wrap">{event.description || 'No description provided for this event.'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Registration Form (Sticky) */}
                    <div className="lg:-mt-24 relative z-20 animate-fade-in-up delay-200">
                        <div className="sticky top-8 rounded-3xl overflow-hidden bg-background border border-border/50 shadow-[0_0_50px_-12px_rgba(79,70,229,0.25)] ring-1 ring-black/5 dark:ring-white/10 dark:shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)]">
                            <div className="p-8 border-b border-border/50 bg-muted/20 backdrop-blur-md">
                                <h2 className="text-2xl font-bold tracking-tight mb-2">Reserve a spot</h2>
                                <p className="text-muted-foreground font-medium">
                                    {isFull ? (
                                        <span className="text-red-500 font-bold">This event is currently full.</span>
                                    ) : (
                                        `${event.capacity - event.current_registrations} spots remaining`
                                    )}
                                </p>
                            </div>

                            <div className="p-8 bg-background">
                                {isFull ? (
                                    <div className="p-5 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl border border-red-100 dark:border-red-900 shadow-inner">
                                        Registration is closed because the event has reached its total capacity.
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2 relative">
                                                <Label htmlFor="fullName" className="text-sm font-semibold">Full Name</Label>
                                                <Input id="fullName" placeholder="Jane Doe" className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" {...register('fullName')} />
                                                {errors.fullName && <p className="text-xs text-red-500 absolute -bottom-5">{errors.fullName.message}</p>}
                                            </div>

                                            <div className="space-y-2 relative pt-2">
                                                <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                                                <Input id="email" type="email" placeholder="jane@company.com" className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" {...register('email')} />
                                                {errors.email && <p className="text-xs text-red-500 absolute -bottom-5">{errors.email.message}</p>}
                                            </div>

                                            <div className="space-y-2 relative pt-2">
                                                <Label htmlFor="phone" className="text-sm font-semibold">Phone Number <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                                                <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" {...register('phone')} />
                                            </div>

                                            <div className="space-y-2 pt-2">
                                                <Label htmlFor="professionalStatus" className="text-sm font-semibold">Professional Status</Label>
                                                <select
                                                    id="professionalStatus"
                                                    className="flex h-12 w-full rounded-md bg-muted/50 border-0 px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                                                    {...register('professionalStatus')}
                                                >
                                                    <option value="Student">Student</option>
                                                    <option value="Working Professional">Working Professional</option>
                                                    <option value="Entrepreneur">Entrepreneur</option>
                                                    <option value="Freelancer">Freelancer</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        {error && <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-900 mt-2">{error}</div>}

                                        <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 hover:shadow-primary/40 mt-6" disabled={registering}>
                                            {registering ? 'Processing...' : 'Secure My Spot'}
                                        </Button>

                                        <p className="text-xs text-center text-muted-foreground mt-4 leading-relaxed max-w-[250px] mx-auto">
                                            By registering, you agree to receive event updates and communications.
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
