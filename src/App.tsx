
import { Routes, Route, Navigate } from "react-router-dom"
import { AuthLayout } from "./features/auth/AuthLayout"
import { LoginPage } from "./features/auth/LoginPage"
import { SignupPage } from "./features/auth/SignupPage"
import { ProtectedRoute } from "./features/auth/ProtectedRoute"
import { DashboardPage } from "./features/dashboard/DashboardPage"
import { AuthProvider } from "./features/auth/AuthContext"
import { RegisterEventPage } from "./features/public/RegisterEventPage"
import { CreateEventPage } from "./features/events/CreateEventPage"
import { EventStatsPage } from "./features/stats/EventStatsPage"
import { AttendanceConfirmedPage } from "./features/public/AttendanceConfirmedPage"
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/react"

function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public Auth Routes */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                </Route>

                {/* Protected Dashboard Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/create-event" element={<CreateEventPage />} />
                    <Route path="/event/:eventId/analytics" element={<EventStatsPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>

                {/* Public Event Routes */}
                <Route path="/register/:eventId" element={<RegisterEventPage />} />
                <Route path="/e/:slug" element={<RegisterEventPage />} />
                <Route path="/attendance-confirmed" element={<AttendanceConfirmedPage />} />


                {/* Catch all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
            <Analytics />
        </AuthProvider>
    )
}

export default App
