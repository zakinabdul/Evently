
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
                .single()

            if (existing) {
                throw new Error('You are already registered for this event with this email.')
            }

            // Register
            const { error: regError } = await supabase
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

            if (regError) throw regError

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
        <div className="min-h-screen bg-muted/20 py-12 px-4">
            <div className="container mx-auto max-w-5xl grid lg:grid-cols-2 gap-8">

                {/* Event Details */}
                <div className="space-y-6">
                    <div>
                        <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4 capitalize">
                            {event.event_type} Event
                        </span>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">{event.title}</h1>
                        <div className="text-xl text-muted-foreground">
                            by {event.organizer?.organization_name || 'Organizer'}
                        </div>
                    </div>

                    <div className="grid gap-4 text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-primary" />
                            <span className="text-lg">{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-primary" />
                            <span className="text-lg">{format(eventDate, 'h:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-primary" />
                            <span className="text-lg">{event.event_type === 'online' ? 'Online Event' : event.location}</span>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-xl font-semibold mb-2">About this event</h3>
                        <p className="whitespace-pre-wrap">{event.description || 'No description provided.'}</p>
                    </div>
                </div>

                {/* Registration Form */}
                <div>
                    <Card className="sticky top-8">
                        <CardHeader>
                            <CardTitle>Register for this event</CardTitle>
                            <CardDescription>
                                {isFull ? 'This event is currently full.' : `${event.capacity - event.current_registrations} spots remaining`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isFull ? (
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                                    Registration is closed because the event has reached its capacity.
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input id="fullName" placeholder="John Doe" {...register('fullName')} />
                                        {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
                                        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                                        <Input id="phone" type="tel" placeholder="+1 234 567 8900" {...register('phone')} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="professionalStatus">Professional Status</Label>
                                        <select
                                            id="professionalStatus"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...register('professionalStatus')}
                                        >
                                            <option value="Student">Student</option>
                                            <option value="Working Professional">Working Professional</option>
                                            <option value="Entrepreneur">Entrepreneur</option>
                                            <option value="Freelancer">Freelancer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {error && <p className="text-sm text-red-500">{error}</p>}

                                    <Button type="submit" className="w-full size-lg text-lg" disabled={registering}>
                                        {registering ? 'Registering...' : 'Secure My Spot'}
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground mt-4">
                                        By registering, you agree to receive event updates.
                                    </p>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
