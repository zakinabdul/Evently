
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../auth/AuthContext'

export type Event = {
    id: string
    title: string
    description: string
    event_type: 'online' | 'in-person'
    location: string
    start_date: string
    start_time: string
    current_registrations: number
    capacity: number
    slug: string | null
}

export function useEvents() {
    const { user } = useAuth()
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!user) return

        const fetchEvents = async () => {
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('organizer_id', user.id)
                    .order('start_date', { ascending: true })

                if (error) throw error
                setEvents(data || [])
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchEvents()
    }, [user])

    return { events, loading, error }
}
