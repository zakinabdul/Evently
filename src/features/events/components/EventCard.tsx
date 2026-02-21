
import { Calendar, MapPin, Users, Copy, ArrowRight, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Event } from '../../dashboard/useEvents'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface EventCardProps {
    event: Event
    onDelete?: (eventId: string) => Promise<boolean>
}

export function EventCard({ event, onDelete }: EventCardProps) {
    const eventDate = new Date(`${event.start_date}T${event.start_time}`)

    const copyLink = () => {
        const identifier = event.slug || event.id
        const url = `${window.location.origin}/e/${identifier}`
        navigator.clipboard.writeText(url)
        toast.success('Short link copied to clipboard!')
    }

    return (
        <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-zinc-900/50 group">
            <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent pb-4 border-b border-primary/5">
                <div className="flex justify-between items-start">
                    <CardTitle className="line-clamp-1 text-lg" title={event.title}>
                        {event.title}
                    </CardTitle>
                    <span className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-full border shadow-sm",
                        event.event_type === 'online'
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20"
                            : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"
                    )}>
                        {event.event_type === 'online' ? 'Online' : 'In-Person'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 pt-4">
                <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 mr-3">
                        <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{format(eventDate, 'MMMM d, yyyy • h:mm a')}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mr-3">
                        <MapPin className="h-4 w-4" />
                    </div>
                    <span className="line-clamp-1 truncate">{event.location}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mr-3">
                        <Users className="h-4 w-4" />
                    </div>
                    <div className="w-full">
                        <div className="flex justify-between mb-1">
                            <span>{event.current_registrations} registered</span>
                            <span>{event.capacity} total</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary"
                                style={{ width: `${Math.min(100, (event.current_registrations / event.capacity) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-3 pt-4 border-t bg-muted/20">
                {onDelete && (
                    <Button variant="outline" size="sm" onClick={async () => {
                        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                            try {
                                await onDelete(event.id);
                                toast.success('Event deleted successfully');
                            } catch (e) {
                                toast.error('Failed to delete event');
                            }
                        }
                    }} className="col-span-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Event
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={copyLink} className="w-full bg-background hover:bg-muted font-medium">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                </Button>
                <Button asChild size="sm" className="w-full font-medium shadow-sm transition-all hover:shadow-primary/25">
                    <Link to={`/event/${event.id}/analytics`}>
                        Manage Event
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
