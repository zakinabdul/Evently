import { Outlet } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'

export function AuthLayout() {
    return (
        <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background selection:bg-primary/30">
            {/* Left Side: Brand & Visuals */}
            <div className="relative hidden lg:flex w-[45%] flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-white">
                {/* Background Gradient Orbs */}
                <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600/30 blur-[120px]"></div>
                <div className="absolute top-[40%] -right-[20%] h-[400px] w-[400px] rounded-full bg-purple-600/30 blur-[100px]"></div>
                <div className="absolute -bottom-[10%] left-[20%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[150px]"></div>

                <div className="relative z-10 flex items-center gap-3 text-3xl font-extrabold tracking-tight">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20">
                        <CalendarDays className="h-6 w-6 text-white" />
                    </div>
                    <span>AppointFlow</span>
                </div>

                <div className="relative z-10 glass-card p-8 rounded-2xl max-w-md animate-fade-in-up delay-200">
                    <p className="text-secondary-foreground text-lg leading-relaxed font-medium">
                        "AppointFlow completely transformed how we manage our events. The seamless integration and intelligent automation save us hours every week."
                    </p>
                    <div className="mt-6 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400"></div>
                        <div>
                            <p className="font-semibold text-white">Alex Chen</p>
                            <p className="text-sm text-zinc-400">Head of Events, TechCorp</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex flex-1 items-center justify-center p-8 lg:p-12 relative">
                {/* Mobile Header (Hidden on Desktop) */}
                <div className="absolute top-8 left-8 flex lg:hidden items-center gap-2 text-2xl font-bold tracking-tight">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <CalendarDays className="h-5 w-5" />
                    </div>
                    <span>AppointFlow</span>
                </div>

                <div className="w-full max-w-[400px] animate-fade-in-up">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
