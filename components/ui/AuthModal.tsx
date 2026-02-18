'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Called after a successful login so the parent can navigate. */
    onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const supabase = createClient();
    const overlayRef = useRef<HTMLDivElement>(null);

    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signupSuccess, setSignupSuccess] = useState(false);

    // Reset state whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('login');
            setEmail('');
            setPassword('');
            setError(null);
            setSignupSuccess(false);
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setSignupSuccess(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onSuccess();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={overlayRef}
                    onClick={handleOverlayClick}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors z-10"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Gradient accent bar */}
                        <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-red-500" />

                        <div className="p-8 space-y-6">
                            {signupSuccess ? (
                                /* ── Sign-up success state ── */
                                <div className="text-center space-y-4 py-4">
                                    <div className="text-4xl">📬</div>
                                    <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
                                    <p className="text-sm text-slate-500">
                                        We sent a confirmation link to{' '}
                                        <strong className="text-slate-700">{email}</strong>.
                                        Click it to activate your account, then sign in.
                                    </p>
                                    <button
                                        onClick={() => { setMode('login'); setSignupSuccess(false); }}
                                        className="text-sm font-semibold text-orange-500 hover:text-orange-700 transition-colors"
                                    >
                                        Back to sign in
                                    </button>
                                </div>
                            ) : (
                                /* ── Login / Signup form ── */
                                <>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">
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
                                                // iOS Safari password rules hint
                                                passwordrules: 'minlength: 8; required: lower; required: upper; required: digit;',
                                            })}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            fullWidth
                                        />

                                        {error && (
                                            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
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
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
