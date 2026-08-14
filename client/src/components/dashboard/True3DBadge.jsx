import { useState } from 'react';
import '../../styles/true3dbadge.css';

export default function True3DBadge({ tier, isLocked, iconUrl, onClick }) {
    const [isSpinning, setIsSpinning] = useState(false);

    const handleClick = () => {
        if (!isLocked && !isSpinning) {
            setIsSpinning(true);
            setTimeout(() => setIsSpinning(false), 1000);
            if (onClick) onClick();
        } else if (isLocked && onClick) {
            onClick(); // Just open the detail popup
        }
    };

    // Calculate dynamic shapes based on tier
    // Valid tiers: bronze, silver, gold, emerald
    const activeTier = isLocked ? 'locked' : tier;

    // We generate 8 layers for the extrusion. 
    // Layer 0 is the farthest back (Z=-4px), Layer 7 is the front (Z=3px).
    const layers = Array.from({ length: 8 }, (_, i) => i);

    return (
        <div className="true3d-badge-container" onClick={handleClick}>
            <div className={`true3d-model ${activeTier} ${isSpinning ? 'spin' : ''}`}>

                {/* Extrusion Layers */}
                {layers.map(layerIdx => {
                    const zOffset = (layerIdx - 4) * 2; // -8px to +6px
                    const isFront = layerIdx === 7;
                    const isBack = layerIdx === 0;

                    return (
                        <div
                            key={layerIdx}
                            className={`true3d-layer ${isFront ? 'front' : ''} ${isBack ? 'back' : 'edge'}`}
                            style={{ transform: `translateZ(${zOffset}px)` }}
                        >
                            {/* The front layer shows the icon continuously, grayscale if locked */}
                            {isFront && iconUrl && (
                                <img
                                    src={iconUrl}
                                    alt="Milestone"
                                    className={`true3d-icon ${isLocked ? 'grayscale' : ''}`}
                                    loading="lazy"
                                />
                            )}
                        </div>
                    );
                })}

            </div>
        </div>
    );
}
