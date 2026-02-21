import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import LandingHero from '@/components/layout/LandingHero';
import FeatureGrid from '@/components/landing/FeatureGrid';
import { AuthModalProvider } from '@/lib/contexts/AuthModalContext';

export const metadata: Metadata = {
    title: 'AbiturCheck – Abitur Risikoanalyse & Notenprognose',
    description:
        'Berechne dein Abitur-Risiko kostenlos. AbiturCheck analysiert deine Fächerwahl, erkennt Notenrisiken und gibt dir eine klare Prognose für dein Abitur 2026.',
};

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-orange-200 selection:text-orange-900">
            <AuthModalProvider>
                <Navbar />
                <LandingHero />
                <FeatureGrid />
            </AuthModalProvider>
        </main>
    );
}
