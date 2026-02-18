'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const locale = (params?.locale as string) ?? 'de';
    const redirectTo = searchParams?.get('redirectTo') ?? `/${locale}/setup`;

    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [signupSuccess, setSignupSuccess] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/${locale}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
                    },
                });
                if (error) throw error;
                setSignupSuccess(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push(redirectTo);
                router.refresh();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (signupSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4">
                    <div className="text-4xl">📬</div>
                    <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
                    <p className="text-slate-500 text-sm">
                        We sent a confirmation link to <strong>{email}</strong>.
                        Click it to activate your account, then come back to sign in.
                    </p>
                    <button
                        onClick={() => { setMode('login'); setSignupSuccess(false); }}
                        className="text-sm font-semibold text-orange-500 hover:text-orange-700"
                    >
                        Back to sign in
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
            {/* Logo */}
            <Link href={`/${locale}`} className="mb-8">
                <Image
                    src="/logo.png"
                    alt="Abitur Risk Management"
                    width={2816}
                    height={1536}
                    className="h-16 w-auto"
                    priority
                />
            </Link>

            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {mode === 'login' ? 'Sign in to ARM' : 'Create your account'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {mode === 'login'
                            ? 'Enter your credentials to continue.'
                            : 'Start monitoring your Abitur risk for free.'}
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleAuth}>
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        {...(mode === 'signup' && {
                            minLength: 8,
                            passwordrules: 'minlength: 8; required: lower; required: upper; required: digit;',
                        })}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                    />

                    {error && (
                        <p className="text-red-600 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        isLoading={isLoading}
                        className="h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-sm shadow-orange-500/20"
                    >
                        {mode === 'login' ? 'Sign in' : 'Create account'}
                    </Button>
                </form>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                        className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        {mode === 'login'
                            ? "Don't have an account? Sign up"
                            : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
