import { createContext, useContext } from 'react';

export const STORAGE_KEY = 'savify_theme';

export const ThemeContext = createContext(null);

/** Dark is the default and the design's home; light is a full sibling. */
export function readStoredTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch {
        // Private browsing or blocked storage — fall through to the default.
    }
    return 'dark';
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    // Usable outside the provider so a stray component cannot crash the page.
    if (!ctx) {
        return { theme: 'dark', setTheme: () => {}, toggleTheme: () => {}, isDark: true };
    }
    return ctx;
}
