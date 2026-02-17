
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

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </AuthProvider>
    )
}

export default App
