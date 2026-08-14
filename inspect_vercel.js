const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://savifytrial-xi.vercel.app/', { waitUntil: 'networkidle0' });

    const info = await page.evaluate(() => {
        const headline = document.querySelector('.hero-headline');
        if (!headline) return 'No headline found';

        const rect = headline.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(headline);

        return {
            rect: {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
            },
            opacity: computedStyle.opacity,
            transform: computedStyle.transform,
            hasVisibleClass: headline.classList.contains('visible'),
            classList: Array.from(headline.classList),
            parentElementRect: headline.parentElement.getBoundingClientRect(),
            bodyScrollHeight: document.body.scrollHeight,
            windowHeight: window.innerHeight,
        };
    });

    console.log(JSON.stringify(info, null, 2));
    await browser.close();
})();
