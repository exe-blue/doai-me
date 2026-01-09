const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function test() {
    console.log('Connecting to Chrome at http://127.0.0.1:9300...');

    const browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9300',
        defaultViewport: null
    });

    console.log('✅ Connected!');

    const page = await browser.newPage();
    console.log('✅ New page created');

    console.log('Navigating to YouTube...');
    await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
    console.log('✅ Navigated to YouTube');

    const title = await page.title();
    console.log('📄 Page title:', title);

    // Wait a bit for content to load
    await new Promise(r => setTimeout(r, 3000));

    // Take screenshot
    const screenshot = await page.screenshot();
    fs.mkdirSync('logs', { recursive: true });
    fs.writeFileSync('logs/youtube-test.png', screenshot);
    console.log('📸 Screenshot saved to logs/youtube-test.png');

    // Try to search for something
    console.log('Searching for "cat videos"...');
    await page.goto('https://www.youtube.com/results?search_query=cat+videos', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    const searchTitle = await page.title();
    console.log('📄 Search page title:', searchTitle);

    const searchScreenshot = await page.screenshot();
    fs.writeFileSync('logs/youtube-search-test.png', searchScreenshot);
    console.log('📸 Search screenshot saved to logs/youtube-search-test.png');

    await browser.disconnect();
    console.log('✅ Done!');
}

test().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
