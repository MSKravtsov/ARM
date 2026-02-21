'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
    const params = useParams();
    const locale = (params?.locale as string) ?? 'de';
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/${locale}/auth/callback?next=/${locale}/auth/reset-password`,
            });
            if (error) throw error;
            setSent(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4">
                    <div className="text-4xl">📧</div>
                    <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
                    <p className="text-slate-500 text-sm">
                        We sent a password reset link to <strong className="text-slate-700">{email}</strong>.
                        Click the link in the email to set a new password.
                    </p>
                    <Link
                        href={`/${locale}/auth/login`}
                        className="inline-block text-sm font-semibold text-orange-500 hover:text-orange-700 transition-colors"
                    >
                        Back to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
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
                    <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Enter your email and we&#39;ll send you a link to reset your password.
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
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
                        Send reset link
                    </Button>
                </form>

                <div className="text-center">
                    <Link
                        href={`/${locale}/auth/login`}
                        className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
