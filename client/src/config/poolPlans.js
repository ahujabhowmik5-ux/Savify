// ══════════════════════════════════════════════════════════════
// Pool plan catalogue
// ══════════════════════════════════════════════════════════════
// The single source of truth for which plans exist per platform.
//
// It lives here rather than inside the modals because the dashboard brand
// cards need the same list: a card's "N pooling" badge counts members from
// exactly the plans its modal will render. When the card matched pool types by
// substring instead, it counted legacy types the modal never lists — the old
// 'Netflix Pool' next to 'Netflix Standard', or 'Jio Hotstar' seats landing on
// the 'Jio' telecom card — so a card could advertise five people while the
// plans behind it held two.
//
// A plan name here must match a pool_types.name row exactly.

export const AI_PLATFORM_CONFIG = {
        'ChatGPT': {
            logo: '/logos/chatgpt.png',
            fallbackIcon: 'fa-robot',
            accent: '#10A37F',
            plans: [
                {
                    name: 'ChatGPT Individual GO',
                    description: 'Basic access to AI tools.',
                    price: '₹399',
                    splitPrice: 133,
                    features: ['Standard messaging', 'Basic AI tasks']
                },
                {
                    name: 'ChatGPT Individual PLUS',
                    description: 'For individuals looking to amplify their productivity',
                    price: '₹1999',
                    splitPrice: 666,
                    features: ['Access to GPT-4', 'Advanced data analysis, vision & web browsing', 'Create and use custom GPTs']
                },
                {
                    name: 'ChatGPT Individual PRO',
                    description: 'For power users needing max capacity.',
                    price: '₹10699',
                    splitPrice: 3566,
                    features: ['Max usage limits', 'Priority processing', 'Early access to new features']
                },
                {
                    name: 'ChatGPT Business',
                    description: 'For teams looking to collaborate and govern.',
                    price: '₹1800/user',
                    splitPrice: 600,
                    features: ['Higher message limits', 'Create and share workspace GPTs', 'Admin console for workspace management']
                }
            ]
        },
        'Claude': {
            logo: '/logos/claude.png',
            fallbackIcon: 'fa-brain',
            accent: '#D97757',
            plans: [
                {
                    name: 'Claude Pro',
                    description: 'More usage, priority access, and the newest models.',
                    price: '₹1,950',
                    splitPrice: 650,
                    features: ['5x more usage than Free', 'Access to Claude 3.5 Sonnet, Opus and Haiku', 'Priority access during high-traffic periods', 'Early access to new features']
                },
                {
                    name: 'Claude Max',
                    description: 'For extreme power users with heavy workflows.',
                    price: '₹9,750',
                    splitPrice: 3250,
                    features: ['Up to 5x to 20x higher usage capacity', 'Priority processing on highest load times']
                },
                {
                    name: 'Claude Team',
                    description: 'For teams looking to collaborate and govern.',
                    price: '₹2,400/user',
                    splitPrice: 800,
                    features: ['Higher usage limits per team member', 'Centralized billing and admin controls']
                }
            ]
        },
        'Gemini': {
            logo: '/logos/gemini.png',
            fallbackIcon: 'fa-sparkles',
            accent: '#4B90FF',
            plans: [
                {
                    name: 'Google AI Plus',
                    description: 'Get our most capable AI models and more storage.',
                    price: '₹399',
                    splitPrice: 133,
                    features: ['Access to Gemini', 'Basic storage']
                },
                {
                    name: 'Google AI Pro',
                    description: 'Bring AI into Google Workspace for organizations.',
                    price: '₹1950',
                    splitPrice: 650,
                    features: ['Bring AI into Google Workspace', 'Enterprise-grade data protection']
                },
                {
                    name: 'Google AI Ultra 5x',
                    description: 'Advanced meetings and enterprise control.',
                    price: '₹6500',
                    splitPrice: 2166,
                    features: ['High capacity usage', 'Advanced AI meetings']
                },
                {
                    name: 'Google AI Ultra 20x',
                    description: 'Extreme processing power and scale.',
                    price: '₹19500',
                    splitPrice: 6500,
                    features: ['Max capacity usage', 'Enhanced DLP and security controls']
                }
            ]
        }
};

export const SUB_PLATFORM_CONFIG = {
        // ─── Fun & Thrill ───
        'Netflix': {
            logo: '/logos/netflix.png',
            fallbackIcon: 'fa-film',
            accent: '#E50914',
            plans: [
                { name: 'Netflix Standard', description: 'Great video quality in 1080p. Watch on 2 supported devices at a time.', price: '₹499', splitPrice: 250, maxMembers: 2, features: ['1080p Resolution', '2 Screens simultaneously', 'Ad-free experience', 'Download on 2 devices'] },
                { name: 'Netflix Premium', description: 'Best video quality in 4K+HDR. Watch on 4 supported devices at a time.', price: '₹649', splitPrice: 162, maxMembers: 4, features: ['4K (Ultra HD) + HDR', '4 Screens simultaneously', 'Ad-free experience', 'Download on 6 devices', 'Netflix spatial audio'] },
                { name: 'Netflix Mobile', description: 'Good video quality in 480p. Watch on 1 mobile phone or tablet.', price: '₹149', splitPrice: 75, maxMembers: 2, features: ['480p Resolution', '1 Mobile or Tablet', 'Ad-free experience', 'Download on 1 device'] },
                { name: 'Netflix Basic', description: 'Good video quality in 720p. Watch on 1 supported device at a time.', price: '₹199', splitPrice: 100, maxMembers: 2, features: ['720p Resolution', '1 Screen simultaneously', 'Ad-free experience', 'Download on 1 device'] }
            ]
        },
        'Spotify': {
            logo: '/logos/spotify.png',
            fallbackIcon: 'fa-music',
            accent: '#1DB954',
            plans: [
                { name: 'Spotify Standard', description: 'Premium accounts for couples.', price: '₹139/2mo', splitPrice: 70, maxMembers: 2, features: ['Ad-free music listening', 'Download to listen offline', 'Play songs in any order', 'High audio quality'] },
                { name: 'Spotify Platinum', description: 'The ultimate Spotify experience.', price: '₹299/mo', splitPrice: 100, maxMembers: 3, features: ['Lossless audio quality (HiFi)', 'AI DJ tools', 'Ad-free music listening', 'Headphone optimization'] },
                { name: 'Spotify Student', description: 'Special discount for eligible students.', price: '₹69/2mo', splitPrice: 35, maxMembers: 2, features: ['Ad-free music listening', 'Download to listen offline', 'Play songs in any order'] }
            ]
        },
        'Prime Video': {
            logo: '/logos/amazon_prime.png',
            fallbackIcon: 'fa-play-circle',
            accent: '#00A8E1',
            plans: [
                { name: 'Prime Video Monthly', description: 'Enjoy Amazon Prime benefits for one month.', price: '₹299', splitPrice: 60, maxMembers: 5, features: ['Prime Video access', 'Free fast delivery on Amazon', 'Ad-free Amazon Music', 'Watch on 3 devices'] },
                { name: 'Prime Video Quarterly', description: '3 months of Amazon Prime benefits.', price: '₹599', splitPrice: 120, maxMembers: 5, features: ['Prime Video access', 'Free fast delivery on Amazon', 'Ad-free Amazon Music', 'Watch on 3 devices'] },
                { name: 'Prime Video Annual', description: 'Best value! 12 months of Amazon Prime benefits.', price: '₹1,499', splitPrice: 300, maxMembers: 5, features: ['Prime Video access', 'Free fast delivery on Amazon', 'Ad-free Amazon Music', 'Watch on 3 devices'] }
            ]
        },
        'Jio Hotstar': {
            logo: '/logos/jiohotstar.png',
            fallbackIcon: 'fa-tv',
            accent: '#1F3F7A',
            plans: [
                { name: 'Jio Hotstar Mobile 1 Month', description: 'Watch on Mobile, 1 screen.', price: '₹79', splitPrice: 40, maxMembers: 2, features: ['Mobile only', '1 device at a time', 'Live sports & TV'] },
                { name: 'Jio Hotstar Mobile 3 Month', description: 'Watch on Mobile, 1 screen.', price: '₹149', splitPrice: 75, maxMembers: 2, features: ['Mobile only', '1 device at a time', 'Live sports & TV'] },
                { name: 'Jio Hotstar Mobile 1 Year', description: 'Watch on Mobile, 1 screen.', price: '₹499', splitPrice: 250, maxMembers: 2, features: ['Mobile only', '1 device at a time', 'Live sports & TV'] },
                { name: 'Jio Hotstar Super 1 Month', description: 'Watch on TV or Mobile, in 1080p.', price: '₹149', splitPrice: 75, maxMembers: 2, features: ['1080p Full HD', '2 devices at a time', 'Live sports & TV', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Super 3 Month', description: 'Watch on TV or Mobile, in 1080p.', price: '₹349', splitPrice: 175, maxMembers: 2, features: ['1080p Full HD', '2 devices at a time', 'Live sports & TV', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Super 1 Year', description: 'Watch on TV or Mobile, in 1080p.', price: '₹1099', splitPrice: 550, maxMembers: 2, features: ['1080p Full HD', '2 devices at a time', 'Live sports & TV', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Premium 1 Month', description: 'Watch on TV or Mobile, in 4K.', price: '₹299', splitPrice: 75, maxMembers: 4, features: ['4K (Ultra HD)', '4 devices at a time', 'Ad-free movies & shows', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Premium 3 Month', description: 'Watch on TV or Mobile, in 4K.', price: '₹699', splitPrice: 175, maxMembers: 4, features: ['4K (Ultra HD)', '4 devices at a time', 'Ad-free movies & shows', 'Dolby 5.1 supported'] },
                { name: 'Jio Hotstar Premium 1 Year', description: 'Watch on TV or Mobile, in 4K.', price: '₹2199', splitPrice: 550, maxMembers: 4, features: ['4K (Ultra HD)', '4 devices at a time', 'Ad-free movies & shows', 'Dolby 5.1 supported'] }
            ]
        },
        // ─── Food ───
        'Swiggy One': {
            logo: '/logos/swiggy.png',
            fallbackIcon: 'fa-utensils',
            accent: '#FC8019',
            plans: [
                { name: 'Swiggy One Lite', description: 'Free delivery on food orders above ₹149. Basic savings.', price: '₹99/month', splitPrice: 50, maxMembers: 2, features: ['Free delivery on food (₹149+)', 'Free delivery on Instamart (₹199+)', 'No surge fee', 'Priority support'] },
                { name: 'Swiggy One', description: 'Unlimited free delivery + extra discounts on everything.', price: '₹149/month', splitPrice: 50, maxMembers: 3, features: ['Free delivery on all food orders', 'Free delivery on Instamart', 'Extra discounts up to 30%', 'No surge fee', 'Priority customer support'] },
                { name: 'Swiggy One Annual', description: 'Best value — full year of Swiggy One benefits.', price: '₹999/year', splitPrice: 333, maxMembers: 3, features: ['All Swiggy One benefits', '12 months access', 'Save ₹789 vs monthly', 'Free delivery on all orders', 'Extra discounts up to 30%'] }
            ]
        },
        'Zomato Gold': {
            logo: '/logos/zomato.png',
            fallbackIcon: 'fa-hamburger',
            accent: '#E23744',
            plans: [
                { name: 'Zomato Gold Monthly', description: 'Free delivery + extra discounts on food orders.', price: '₹149/month', splitPrice: 75, maxMembers: 2, features: ['Free delivery on all orders', 'Up to 30% extra discount', 'No surge fee', 'Priority delivery'] },
                { name: 'Zomato Gold Quarterly', description: '3 months of Zomato Gold at a great price.', price: '₹299/3months', splitPrice: 100, maxMembers: 3, features: ['Free delivery on all orders', 'Up to 30% extra discount', 'No surge fee', 'VIP customer support', 'Priority delivery'] },
                { name: 'Zomato Gold Annual', description: 'Best value — full year of Zomato Gold.', price: '₹999/year', splitPrice: 250, maxMembers: 4, features: ['All Gold benefits for 12 months', 'Save ₹789 vs monthly', 'Free delivery everywhere', 'Up to 30% extra discount', 'VIP support'] }
            ]
        },
        // ─── Education ───
        'Udemy': {
            logo: '/logos/udemy.png',
            fallbackIcon: 'fa-graduation-cap',
            accent: '#A435F0',
            plans: [
                { name: 'Udemy Personal Plan', description: 'Access top-rated courses with a monthly subscription.', price: '₹850/month', splitPrice: 283, maxMembers: 3, features: ['Access to 12,000+ top courses', 'Practice tests & exercises', 'Q&A with instructors', 'Certificate of completion', 'Mobile & TV access'] },
                { name: 'Udemy Team Plan', description: 'Team learning with advanced admin features.', price: '₹1,067/user/month', splitPrice: 356, maxMembers: 3, features: ['All Personal Plan features', 'Organization analytics', 'Team admin console', 'Custom learning paths', 'SSO integration'] }
            ]
        },
        'Coursera': {
            logo: '/logos/coursera.png',
            fallbackIcon: 'fa-university',
            accent: '#0056D2',
            plans: [
                { name: 'Coursera Plus Monthly', description: 'Unlimited access to 7,000+ courses, projects & certificates.', price: '₹4,167/month', splitPrice: 1389, maxMembers: 3, features: ['7,000+ courses & specializations', 'Unlimited certificates', 'Google, IBM, Meta courses', 'Guided projects', 'Professional certificates'] },
                { name: 'Coursera Plus Annual', description: 'Best value — save big with annual Coursera Plus.', price: '₹29,499/year', splitPrice: 7375, maxMembers: 4, features: ['All monthly features', 'Save ₹20,505 vs monthly', 'University degree courses', 'MasterTrack certificates', 'Offline access'] }
            ]
        },
        // ─── Socials ───
        'YouTube Premium': {
            logo: '/logos/youtube.svg',
            fallbackIcon: 'fa-play',
            accent: '#FF0000',
            plans: [
                { name: 'YouTube Premium Individual', description: 'Ad-free videos, background play & YouTube Music.', price: '₹149/month', splitPrice: 75, maxMembers: 2, features: ['Ad-free videos', 'Background play', 'YouTube Music Premium', 'Download videos', 'Picture-in-picture'] },
                { name: 'YouTube Premium Family', description: 'Share with up to 5 family members (same household).', price: '₹189/month', splitPrice: 38, maxMembers: 5, features: ['All Premium features', 'Up to 5 family members', 'Each gets their own account', 'YouTube Music included', 'YouTube Kids ad-free'] }
            ]
        },
        'LinkedIn Premium': {
            logo: '/logos/linkedin.svg',
            fallbackIcon: 'fa-briefcase',
            accent: '#0A66C2',
            plans: [
                { name: 'LinkedIn Premium Career', description: 'Stand out and get in touch with recruiters.', price: '₹1,555/month', splitPrice: 518, maxMembers: 3, features: ['See who viewed your profile', 'InMail messages', 'Salary insights', 'Top Applicant badge', 'LinkedIn Learning access'] },
                { name: 'LinkedIn Premium Business', description: 'For professionals looking to grow their network.', price: '₹2,100/month', splitPrice: 700, maxMembers: 3, features: ['15 InMail messages/month', 'Unlimited people browsing', 'Business insights', 'LinkedIn Learning full access', 'Company page analytics'] }
            ]
        },
        // ─── Telecom ───
        'Jio': {
            logo: '/logos/jio.png',
            fallbackIcon: 'fa-signal',
            accent: '#0A3F8F',
            plans: [
                { name: 'Jio Postpaid Family ₹399', description: 'Primary + 1 secondary connection with shared data.', price: '₹399/month', splitPrice: 200, maxMembers: 2, features: ['Unlimited calls', '75GB shared data', 'Free Netflix Mobile', 'Free Amazon Prime Lite', 'International roaming packs'] },
                { name: 'Jio Postpaid Family ₹599', description: 'Primary + 2 secondary connections with more data.', price: '₹599/month', splitPrice: 200, maxMembers: 3, features: ['Unlimited calls', '100GB shared data', 'Free Netflix Basic', 'Free Amazon Prime', 'Free Swiggy One', 'International roaming'] },
                { name: 'Jio Postpaid Family ₹999', description: 'Premium family plan with max data & OTT.', price: '₹999/month', splitPrice: 250, maxMembers: 4, features: ['Unlimited calls', '200GB shared data', 'Free Netflix Standard', 'Free Amazon Prime', 'Free Swiggy One', 'Free JioHotstar', 'International roaming'] }
            ]
        },
        'Airtel': {
            logo: '/logos/airtel.png',
            fallbackIcon: 'fa-broadcast-tower',
            accent: '#FF0000',
            plans: [
                { name: 'Airtel Family ₹599', description: 'Share plan with up to 3 connections.', price: '₹599/month', splitPrice: 200, maxMembers: 3, features: ['Unlimited calls', '75GB shared data', 'Free Amazon Prime', 'Free Wynk Music', 'Airtel Xstream'] },
                { name: 'Airtel Family ₹999', description: 'Premium family with 4 connections & top OTT.', price: '₹999/month', splitPrice: 250, maxMembers: 4, features: ['Unlimited calls', '150GB shared data', 'Free Netflix Standard', 'Free Amazon Prime', 'Free Disney+ Hotstar', 'Airtel Xstream Premium'] },
                { name: 'Airtel Family ₹1,599', description: 'The ultimate family plan with everything included.', price: '₹1,599/month', splitPrice: 320, maxMembers: 5, features: ['Unlimited calls', '300GB shared data', 'Free Netflix Premium', 'Free Amazon Prime', 'Free Disney+ Hotstar', 'Free Apple Music', 'International roaming'] }
            ]
        }
};

/** Plan names for an AI platform card ('ChatGPT', 'Claude', 'Gemini'). */
export function aiPlanNames(platform) {
    return (AI_PLATFORM_CONFIG[platform]?.plans || []).map(p => p.name);
}

/** Plan names for a subscription platform card ('Netflix', 'Jio', ...). */
export function subPlanNames(platform) {
    return (SUB_PLATFORM_CONFIG[platform]?.plans || []).map(p => p.name);
}
