
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
        }
    })

    const eventType = watch('event_type')

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

            const { error } = await supabase.from('events').insert([
                {
                    ...data,
                    slug,
                    organizer_id: user.id
                }
            ])

            if (error) throw error
            navigate('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Failed to create event')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Event</CardTitle>
                    <CardDescription>Enter the details for your new event.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input id="title" placeholder="My Awesome Webinar" {...register('title')} />
                            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Custom Link (Optional)</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">{window.location.host}/e/</span>
                                <Input id="slug" placeholder="my-event-name" {...register('slug')} />
                            </div>
                            <p className="text-xs text-muted-foreground">Leave empty to generate a random short link.</p>
                            {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" placeholder="A brief description..." {...register('description')} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="event_type">Event Type</Label>
                                <select
                                    id="event_type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...register('event_type')}
                                >
                                    <option value="online">Online</option>
                                    <option value="in-person">In-Person</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">{eventType === 'online' ? 'Meeting Link' : 'Address'}</Label>
                                <Input id="location" placeholder={eventType === 'online' ? 'https://zoom.us/...' : '123 Main St'} {...register('location')} />
                                {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Date</Label>
                                <Input id="start_date" type="date" {...register('start_date')} />
                                {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Time</Label>
                                <Input id="start_time" type="time" {...register('start_time')} />
                                {errors.start_time && <p className="text-sm text-red-500">{errors.start_time.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input id="capacity" type="number" placeholder="100" {...register('capacity')} />
                            {errors.capacity && <p className="text-sm text-red-500">{errors.capacity.message}</p>}
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Event'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
