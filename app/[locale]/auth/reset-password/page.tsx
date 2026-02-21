'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';

export default function ResetPasswordPage() {
    const router = useRouter();
    const params = useParams();
    const locale = (params?.locale as string) ?? 'de';
    const supabase = createClient();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => {
                router.push(`/${locale}/setup`);
            }, 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4">
                    <div className="text-4xl">&#10003;</div>
                    <h2 className="text-2xl font-bold text-slate-900">Password updated</h2>
                    <p className="text-slate-500 text-sm">
                        Your password has been reset successfully. Redirecting you now...
                    </p>
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
                    <h2 className="text-2xl font-bold text-slate-900">Set new password</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Enter your new password below.
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <Input
                        label="New password"
                        type="password"
                        name="new-password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                    />
                    <Input
                        label="Confirm password"
                        type="password"
                        name="confirm-password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        Update password
                    </Button>
                </form>
            </div>
        </div>
    );
}
