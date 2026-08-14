import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost:4174/', { waitUntil: 'networkidle0', timeout: 15000 });

        const info = await page.evaluate(() => {
            const headline = document.querySelector('.hero-headline');
            if (!headline) return 'No headline found';

            const rect = headline.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(headline);

            return {
                url: window.location.href,
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
    } catch (e) {
        console.error("Puppeteer Error:", e);
    } finally {
        await browser.close();
    }
})();
