import { useTheme } from '../context/themeContext';

/**
 * Segmented control, not a button that changes label.
 *
 * A toggle whose text changes as you press it forces you to work out whether it
 * names the current state or the action. Two segments with a sliding indicator
 * show both at once: where you are, and where you can go. The indicator is the
 * only thing that moves.
 */
export default function ThemeToggle({ size = 30 }) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const pad = 3;
    const segW = size + 6;

    return (
        <div
            role="radiogroup"
            aria-label="Colour theme"
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                padding: pad,
                borderRadius: 999,
                background: 'var(--sv-bg-subtle)',
                border: '1px solid var(--drops-border)',
                lineHeight: 0
            }}
        >
            {/* The moving part: one indicator, no colour flash, no bounce. */}
            <span
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: pad,
                    left: pad,
                    width: segW,
                    height: size,
                    borderRadius: 999,
                    background: 'var(--drops-surface)',
                    border: '1px solid var(--drops-border-light)',
                    boxShadow: 'var(--sv-shadow-sm)',
                    transform: `translateX(${isDark ? 0 : segW}px)`,
                    transition: 'transform var(--sv-dur) var(--sv-ease)'
                }}
            />
            {[
                { key: 'dark', icon: 'fa-moon', label: 'Dark theme' },
                { key: 'light', icon: 'fa-sun', label: 'Light theme' }
            ].map(opt => {
                const active = theme === opt.key;
                return (
                    <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={opt.label}
                        title={opt.label}
                        onClick={() => setTheme(opt.key)}
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            width: segW,
                            height: size,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: active ? 'var(--drops-text-primary)' : 'var(--drops-text-tertiary)',
                            transition: 'color var(--sv-dur) var(--sv-ease)'
                        }}
                    >
                        <i className={`fas ${opt.icon}`} style={{ fontSize: Math.round(size * 0.42) }} />
                    </button>
                );
            })}
        </div>
    );
}
