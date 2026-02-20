
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginForm) => {
        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (error) throw error
            navigate('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Failed to login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
                <p className="text-muted-foreground">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2 relative">
                        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                            {...register('email')}
                        />
                        {errors.email && <p className="text-sm text-red-500 absolute -bottom-6">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2 relative pt-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <Link to="#" className="text-sm text-primary hover:underline">Forgot password?</Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                            {...register('password')}
                        />
                        {errors.password && <p className="text-sm text-red-500 absolute -bottom-6">{errors.password.message}</p>}
                    </div>
                </div>

                {error && <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">{error}</div>}

                <Button type="submit" className="w-full h-12 text-md transition-all hover:-translate-y-0.5" disabled={loading}>
                    {loading ? 'Logging in...' : 'Sign In'}
                </Button>
            </form>

            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary font-semibold hover:underline">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    )
}
