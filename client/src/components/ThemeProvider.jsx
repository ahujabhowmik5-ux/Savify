import { useEffect, useState, useCallback } from 'react';
import { ThemeContext, STORAGE_KEY, readStoredTheme } from '../context/themeContext';

/**
 * Applies the chosen theme to the document and persists it.
 *
 * The attribute is already set before first paint by the inline script in
 * index.html, so this never causes a flash — it only keeps React in sync with
 * what the document already has.
 */
export default function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(readStoredTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // Not being able to persist is not worth breaking the app over.
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(t => (t === 'dark' ? 'light' : 'dark'));
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}
