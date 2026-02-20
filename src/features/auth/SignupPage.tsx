
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const signupSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    organizationName: z.string().min(2, 'Organization name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

type SignupForm = z.infer<typeof signupSchema>

export function SignupPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
    })

    // Note: Detailed profile creation (organization, full name) requires writing to a 'profiles' table after auth.
    // For this MVP, we will just sign up the user. In a real app, we would use a database trigger or a second query.
    const onSubmit = async (data: SignupForm) => {
        setLoading(true)
        setError(null)
        try {
            const { error: signUpError, data: authData } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        organization_name: data.organizationName,
                    },
                },
            })

            if (signUpError) throw signUpError

            if (authData.user) {
                // Create profile record
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: authData.user.id,
                            full_name: data.fullName,
                            organization_name: data.organizationName,
                            updated_at: new Date()
                        }
                    ])

                if (profileError) {
                    toast.error("Account created, but profile setup failed.")
                } else {
                    toast.success("Account created successfully!")
                }
            }

            navigate('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Failed to sign up')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Create an account</h1>
                <p className="text-muted-foreground">Enter your details below to get started</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 relative">
                            <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                            <Input
                                id="fullName"
                                placeholder="John Doe"
                                className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                                {...register('fullName')}
                            />
                            {errors.fullName && <p className="text-xs text-red-500 absolute -bottom-5">{errors.fullName.message}</p>}
                        </div>
                        <div className="space-y-2 relative">
                            <Label htmlFor="organizationName" className="text-sm font-medium">Organization</Label>
                            <Input
                                id="organizationName"
                                placeholder="Acme Inc."
                                className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                                {...register('organizationName')}
                            />
                            {errors.organizationName && <p className="text-xs text-red-500 absolute -bottom-5">{errors.organizationName.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2 relative pt-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                            {...register('email')}
                        />
                        {errors.email && <p className="text-xs text-red-500 absolute -bottom-5">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2 relative pt-2">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary h-12"
                            {...register('password')}
                        />
                        {errors.password && <p className="text-xs text-red-500 absolute -bottom-5">{errors.password.message}</p>}
                    </div>
                </div>

                {error && <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900 mt-2">{error}</div>}

                <Button type="submit" className="w-full h-12 text-md transition-all hover:-translate-y-0.5 mt-4" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                </Button>
            </form>

            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-semibold hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
