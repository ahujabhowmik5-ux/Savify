import { useTheme } from '../context/themeContext';

/**
 * Two-state switch. Deliberately small and quiet: it is a preference, not a
 * feature, and should not compete with anything on the page.
 */
export default function ThemeToggle({ compact = false }) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light theme' : 'Dark theme'}
            className="sv-interactive"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compact ? 0 : 8,
                width: compact ? 36 : undefined,
                height: 36,
                padding: compact ? 0 : '0 14px',
                borderRadius: 100,
                background: 'var(--drops-surface)',
                border: '1px solid var(--drops-border)',
                color: 'var(--drops-text-secondary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1
            }}
        >
            <i
                className={isDark ? 'fas fa-moon' : 'fas fa-sun'}
                style={{ fontSize: 13, transition: 'opacity var(--sv-dur) var(--sv-ease)' }}
            />
            {!compact && <span>{isDark ? 'Dark' : 'Light'}</span>}
        </button>
    );
}
