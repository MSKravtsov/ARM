'use client';

import {
    createContext,
    useCallback,
    useContext,
    useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import AuthModal from '@/components/ui/AuthModal';

// ─── Context ────────────────────────────────────────────────

interface AuthModalContextValue {
    /**
     * Open the auth modal.
     * @param destination - Where to navigate after a successful login.
     *                      Defaults to `/{locale}/setup`.
     */
    openModal: (destination?: string) => void;
}

const AuthModalContext = createContext<AuthModalContextValue>({
    openModal: () => {},
});

export function useAuthModal() {
    return useContext(AuthModalContext);
}

// ─── Provider ───────────────────────────────────────────────

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const locale = useLocale();

    const [isOpen, setIsOpen] = useState(false);
    const [destination, setDestination] = useState<string | null>(null);

    const openModal = useCallback((dest?: string) => {
        setDestination(dest ?? null);
        setIsOpen(true);
    }, []);

    const handleSuccess = useCallback(() => {
        setIsOpen(false);
        router.push(destination ?? `/${locale}/setup`);
    }, [destination, locale, router]);

    return (
        <AuthModalContext.Provider value={{ openModal }}>
            {children}
            <AuthModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSuccess={handleSuccess}
            />
        </AuthModalContext.Provider>
    );
}
