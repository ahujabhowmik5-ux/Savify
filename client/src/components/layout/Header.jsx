import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const SAVIFY_LOGO = 'https://i.ibb.co/v441FQJ1/gemini-2-5-flash-image-Refine-this-Savify-S-logo-to-be-flatter-more-geometric-and-ultra-premium.png';

export default function Header({ onHelp }) {
    // Determine if we're running natively (iOS or Android) via Capacitor
    const isNative = Capacitor.isNativePlatform();

    return (
        <header className="header glass-header">
            {/* Subtle animated shimmer line at bottom */}
            <div className="header-shimmer"></div>
            <div className="header-inner">
                <a href="/" className="header-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={SAVIFY_LOGO} alt="Savify" className="header-logo-img" />
                    <span className="header-logo-text">Savify</span>
                </a>
                <div className="header-actions">
                    {!isNative && (
                        <a href="/savify.apk" download="savify.apk" target="_blank" rel="noopener noreferrer" className="install-app-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-download"></i>
                            <span>App</span>
                        </a>
                    )}
                </div>
            </div>
        </header>
    );
}
