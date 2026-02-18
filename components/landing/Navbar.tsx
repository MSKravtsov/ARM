'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthModal } from '@/lib/contexts/AuthModalContext';
import type { User } from '@supabase/supabase-js';

export default function Navbar() {
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();
    const { openModal } = useAuthModal();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Hydrate current session on mount
        supabase.auth.getUser().then(({ data }) => setUser(data.user));

        // Keep in sync with auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => setUser(session?.user ?? null)
        );
        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(`/${locale}`);
        router.refresh();
    };

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 w-full z-50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                {/* Logo */}
                <Link href={`/${locale}`} className="flex items-center gap-2 group">
                    <div className="relative h-24 w-auto">
                        <Image
                            src="/logo.png"
                            alt="Abitur Risk Management"
                            width={2816}
                            height={1536}
                            className="h-full w-auto object-contain"
                            priority
                        />
                    </div>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    {/* Language Switcher */}
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-white/50 px-2 py-1 rounded-md border border-slate-200">
                        <Link
                            href="/en"
                            className={`px-1.5 py-0.5 rounded ${locale === 'en' ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100'}`}
                        >
                            EN
                        </Link>
                        <span className="text-slate-300">|</span>
                        <Link
                            href="/de"
                            className={`px-1.5 py-0.5 rounded ${locale === 'de' ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100'}`}
                        >
                            DE
                        </Link>
                    </div>

                    {/* Auth Button */}
                    {user ? (
                        <button
                            onClick={handleLogout}
                            className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 bg-white/60 hover:bg-white transition-all"
                        >
                            Sign out
                        </button>
                    ) : (
                        <button
                            onClick={() => openModal()}
                            className="text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-4 py-2 rounded-lg shadow-sm shadow-orange-500/20 transition-all hover:scale-[1.02]"
                        >
                            Sign in
                        </button>
                    )}
                </div>
            </div>
        </motion.header>
    );
}
