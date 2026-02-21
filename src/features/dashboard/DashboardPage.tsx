
import { useAuth } from "../auth/AuthContext"
import { Button } from "@/components/ui/button"
import { useEvents } from "./useEvents"
import { EventCard } from "../events/components/EventCard"
import { DashboardStats } from "./DashboardStats"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

export function DashboardPage() {
    const { signOut } = useAuth()
    const { events, loading, error, deleteEvent } = useEvents()

    const now = new Date();

    const upcomingEvents = events.filter(e => {
        if (!e.start_date) return false;
        const timeString = e.start_time ? e.start_time.substring(0, 5) : "00:00";
        const eventDate = new Date(`${e.start_date}T${timeString}:00`);
        return isNaN(eventDate.getTime()) ? false : eventDate > now;
    });

    const pastEvents = events.filter(e => {
        if (!e.start_date) return true;
        const timeString = e.start_time ? e.start_time.substring(0, 5) : "00:00";
        const eventDate = new Date(`${e.start_date}T${timeString}:00`);
        return isNaN(eventDate.getTime()) ? true : eventDate <= now;
    });

    // Sort upcoming events chronologically (soonest first)
    const sortedUpcoming = [...upcomingEvents].sort((a, b) => {
        const timeA = a.start_time ? a.start_time.substring(0, 5) : "00:00";
        const timeB = b.start_time ? b.start_time.substring(0, 5) : "00:00";
        return new Date(`${a.start_date}T${timeA}:00`).getTime() - new Date(`${b.start_date}T${timeB}:00`).getTime();
    });

    // Sort past events reverse-chronologically (most recently finished first)
    const sortedPast = [...pastEvents].sort((a, b) => {
        const timeA = a.start_time ? a.start_time.substring(0, 5) : "00:00";
        const timeB = b.start_time ? b.start_time.substring(0, 5) : "00:00";
        return new Date(`${b.start_date}T${timeB}:00`).getTime() - new Date(`${a.start_date}T${timeA}:00`).getTime();
    });

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 dark:bg-zinc-900/40 p-6 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm backdrop-blur-md">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your events and view analytics.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => signOut()} className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50">Logout</Button>
                    <Button asChild className="rounded-full shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/40">
                        <Link to="/create-event">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Event
                        </Link>
                    </Button>
                </div>
            </div>

            <DashboardStats />

            {loading && <div>Loading events...</div>}

            {error && <div className="p-4 bg-red-50/50 text-red-600 rounded-xl border border-red-100 backdrop-blur-sm">Error: {error}</div>}

            {!loading && !error && events.length === 0 && (
                <div className="p-16 border-2 rounded-3xl border-dashed border-primary/20 bg-primary/5 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Plus className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">No events yet</h2>
                        <p className="text-muted-foreground max-w-sm mx-auto">Get started by creating your first event to see your dashboard come to life.</p>
                    </div>
                    <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/25 hover:-translate-y-0.5">
                        <Link to="/create-event">Create Event</Link>
                    </Button>
                </div>
            )}

            {!loading && !error && events.length > 0 && (
                <div className="space-y-12">
                    {sortedUpcoming.length > 0 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold tracking-tight">Your Upcoming Events</h2>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {sortedUpcoming.map((event, index) => (
                                    <div key={event.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                        <EventCard event={event} onDelete={deleteEvent} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sortedPast.length > 0 && (
                        <div className="space-y-6 pt-6 border-t border-border/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">Past Events</h2>
                                <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{sortedPast.length} completed</span>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-80 hover:opacity-100 transition-opacity">
                                {sortedPast.map((event, index) => (
                                    <div key={event.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                        <EventCard event={event} onDelete={deleteEvent} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
