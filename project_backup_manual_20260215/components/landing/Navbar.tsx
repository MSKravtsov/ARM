'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Navbar() {
    const locale = useLocale();

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 w-full z-50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative h-20 w-auto">
                        <Image
                            src="/logo.png"
                            alt="Abitur Risk Management"
                            width={350}
                            height={80}
                            className="h-full w-auto object-contain"
                            priority
                        />
                    </div>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-6">
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                        <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
                        <Link href="#" className="hover:text-slate-900 transition-colors">Pricing</Link>
                        <Link href="#" className="hover:text-slate-900 transition-colors">About</Link>
                    </nav>

                    <div className="h-4 w-px bg-slate-200 hidden md:block" />

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
                </div>
            </div>
        </motion.header>
    );
}
