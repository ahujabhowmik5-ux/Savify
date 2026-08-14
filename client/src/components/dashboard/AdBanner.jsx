export default function AdBanner({ ad, onAdClick }) {
    if (!ad) return null;

    return (
        <div className="ad-banner-card" onClick={() => onAdClick(ad)}>
            <div className="ad-banner-badge">Ad</div>
            <div className="ad-banner-content">
                {ad.image_url ? (
                    <img src={ad.image_url} alt={ad.title || 'Promotion'} className="ad-banner-image" />
                ) : (
                    <div className="ad-banner-placeholder">
                        <i className="fas fa-bullhorn"></i>
                    </div>
                )}
                <div className="ad-banner-text">
                    <h4>{ad.title || 'Sponsored'}</h4>
                    {ad.description && <p>{ad.description}</p>}
                </div>
                <div className="ad-banner-arrow">
                    <i className="fas fa-external-link-alt"></i>
                </div>
            </div>
        </div>
    );
}
