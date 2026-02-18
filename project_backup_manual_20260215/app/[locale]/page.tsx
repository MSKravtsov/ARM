import Navbar from '@/components/landing/Navbar';
import LandingHero from '@/components/layout/LandingHero';
import FeatureGrid from '@/components/landing/FeatureGrid';

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-orange-200 selection:text-orange-900">
            <Navbar />
            <LandingHero />
            <FeatureGrid />
        </main>
    );
}
