
import { useAuth } from "../auth/AuthContext"
import { Button } from "@/components/ui/button"
import { useEvents } from "./useEvents"
import { EventCard } from "../events/components/EventCard"
import { DashboardStats } from "./DashboardStats"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

export function DashboardPage() {
    const { signOut } = useAuth()
    const { events, loading, error } = useEvents()

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your events and view analytics.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => signOut()}>Logout</Button>
                    <Button asChild>
                        <Link to="/create-event">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Event
                        </Link>
                    </Button>
                </div>
            </div>

            <DashboardStats />

            {loading && <div>Loading events...</div>}

            {error && <div className="text-red-500">Error: {error}</div>}

            {!loading && !error && events.length === 0 && (
                <div className="p-12 border rounded-lg border-dashed text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold">No events yet</h2>
                    <p className="text-muted-foreground">Get started by creating your first event.</p>
                    <Button asChild>
                        <Link to="/create-event">Create Event</Link>
                    </Button>
                </div>
            )}

            {!loading && !error && events.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {events.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    )
}
