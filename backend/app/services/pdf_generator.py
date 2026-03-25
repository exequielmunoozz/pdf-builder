"""
PDF generation using Playwright (Chromium).
Maintains a persistent browser instance for performance.
"""
import asyncio
from playwright.async_api import async_playwright, Browser

_playwright = None
_browser: Browser | None = None
_lock = asyncio.Lock()


async def get_browser() -> Browser:
    global _playwright, _browser
    async with _lock:
        if _browser is None or not _browser.is_connected():
            _playwright = await async_playwright().start()
            _browser = await _playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            )
    return _browser


async def generate_pdf(html: str, page_config: dict = None) -> bytes:
    """Generate a PDF from rendered HTML."""
    if page_config is None:
        page_config = {}

    browser = await get_browser()
    page = await browser.new_page(
        viewport={
            'width': page_config.get('viewportWidth', 794),
            'height': page_config.get('viewportHeight', 1123),
        }
    )

    try:
        await page.set_content(html, wait_until='networkidle', timeout=30000)

        # Wait for all images to load
        await page.evaluate("""() => {
            return new Promise((resolve) => {
                const images = document.querySelectorAll('img');
                if (images.length === 0) return resolve();

                let loaded = 0;
                const total = images.length;

                images.forEach((img) => {
                    if (img.complete) {
                        loaded++;
                        if (loaded === total) resolve();
                    } else {
                        img.addEventListener('load', () => {
                            loaded++;
                            if (loaded === total) resolve();
                        });
                        img.addEventListener('error', () => {
                            loaded++;
                            if (loaded === total) resolve();
                        });
                    }
                });

                setTimeout(resolve, 10000);
            });
        }""")

        margin = page_config.get('margin', {
            'top': '0', 'right': '0', 'bottom': '0', 'left': '0'
        })

        pdf_bytes = await page.pdf(
            format=page_config.get('format', 'A4'),
            landscape=page_config.get('landscape', False),
            print_background=True,
            prefer_css_page_size=True,
            margin=margin,
        )

        return pdf_bytes

    finally:
        await page.close()


async def cleanup():
    """Cleanup browser on shutdown."""
    global _browser, _playwright
    if _browser:
        await _browser.close()
        _browser = None
    if _playwright:
        await _playwright.stop()
        _playwright = None
