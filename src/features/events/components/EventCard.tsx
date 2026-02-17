
import { Calendar, MapPin, Users, Copy, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Event } from '../../dashboard/useEvents'
import { cn } from '@/lib/utils'

interface EventCardProps {
    event: Event
}

export function EventCard({ event }: EventCardProps) {
    const eventDate = new Date(`${event.start_date}T${event.start_time}`)

    const copyLink = () => {
        const identifier = event.slug || event.id
        const url = `${window.location.origin}/e/${identifier}`
        navigator.clipboard.writeText(url)
        // In a real app, show a toast here
        alert('Short link copied to clipboard!')
    }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="line-clamp-1 text-lg" title={event.title}>
                        {event.title}
                    </CardTitle>
                    <span className={cn(
                        "px-2 py-1 text-xs rounded-full border",
                        event.event_type === 'online'
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                    )}>
                        {event.event_type === 'online' ? 'Online' : 'In-Person'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(eventDate, 'MMMM d, yyyy • h:mm a')}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span className="line-clamp-1">{event.location}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    {event.current_registrations} / {event.capacity} registered
                </div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={copyLink}>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy Link
                </Button>
                <Button asChild size="sm">
                    <Link to={`/event/${event.id}/analytics`}>
                        Details
                        <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
