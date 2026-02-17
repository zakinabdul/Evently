
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEventStats } from './useEventStats'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export function EventStatsPage() {
    const { eventId } = useParams<{ eventId: string }>()
    const { data, loading, error } = useEventStats(eventId)

    if (loading) return <div className="p-8">Loading stats...</div>
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>
    if (!data) return null

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

    const downloadCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Professional Status', 'Registration Date']
        const rows = data.registrants.map(r => [
            r.full_name,
            r.email,
            r.phone,
            r.professional_status,
            new Date(r.created_at).toLocaleString()
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers, ...rows].map(e => e.join(",")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `registrants_${eventId}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" asChild>
                    <Link to="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Event Statistics</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Status Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Professional Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.professionalStatusBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {data.professionalStatusBreakdown.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Registration Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Registration Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.registrationTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Registrants Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Registrants ({data.totalRegistrations})</CardTitle>
                    <Button variant="outline" size="sm" onClick={downloadCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="p-4 font-medium">Name</th>
                                    <th className="p-4 font-medium">Email</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.registrants.map((r) => (
                                    <tr key={r.id} className="border-t">
                                        <td className="p-4">{r.full_name}</td>
                                        <td className="p-4">{r.email}</td>
                                        <td className="p-4">{r.professional_status}</td>
                                        <td className="p-4">{new Date(r.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {data.registrants.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-muted-foreground">No registrants yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
