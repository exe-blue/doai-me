#!/usr/bin/env node
/**
 * YouTube Watch Test with Like and Comment
 * Usage: node test-youtube-watch.js [serial] [search] [seconds] [port]
 */

const puppeteer = require('puppeteer-core');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    ADB_PATH: 'C:\\Users\\ChoiJoonho\\adb.exe',
    SOCKET: 'localabstract:chrome_devtools_remote',
    LOG_DIR: path.join(__dirname, '../logs')
};

// CLI arguments
const DEVICE_SERIAL = process.argv[2] || '314b4e5139593098';
const SEARCH_KEYWORD = process.argv[3] || 'relaxing cat videos';
const WATCH_SECONDS = parseInt(process.argv[4]) || 30;
const LOCAL_PORT = parseInt(process.argv[5]) || 9300;
const COMMENT_TEXT = 'Great video!';

// Utility functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function execAsync(command) {
    return new Promise((resolve, reject) => {
        exec(command, { shell: true }, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve({ stdout, stderr });
        });
    });
}

async function saveScreenshot(page, filename) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    const screenshot = await page.screenshot();
    const filepath = path.join(CONFIG.LOG_DIR, filename);
    fs.writeFileSync(filepath, screenshot);
}

// YouTube automation functions
async function skipAd(page) {
    try {
        return await page.evaluate(() => {
            const selectors = [
                '.ytp-ad-skip-button',
                '.ytp-skip-ad-button',
                'button[class*="skip"]',
                '.ytp-ad-skip-button-modern',
                '[class*="skip-button"]'
            ];
            for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
    } catch {
        return false;
    }
}

async function likeVideo(page) {
    try {
        return await page.evaluate(() => {
            const selectors = [
                'ytm-toggle-button-renderer button[aria-label*="like"]',
                'button[aria-label*="like this video"]',
                '#segmented-like-button button',
                'ytd-toggle-button-renderer button[aria-label*="like"]',
                'button[class*="like"]'
            ];
            for (const sel of selectors) {
                const btns = document.querySelectorAll(sel);
                for (const btn of btns) {
                    if (btn.getAttribute('aria-pressed') === 'true') return true;
                    if (btn.offsetParent !== null) {
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        });
    } catch (e) {
        console.log('   Like error:', e.message);
        return false;
    }
}

async function leaveComment(page, text) {
    try {
        await page.evaluate(() => {
            const comments = document.querySelector('#comments, ytm-comments-entry-point-header-renderer');
            if (comments) comments.scrollIntoView({ behavior: 'smooth' });
            else window.scrollBy(0, 800);
        });
        await sleep(2000);

        const opened = await page.evaluate(() => {
            const triggers = ['#placeholder-area', '#simplebox-placeholder', '.comment-simplebox-trigger', 'ytm-comment-simplebox-renderer', '#comment-teaser'];
            for (const sel of triggers) {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) { el.click(); return true; }
            }
            return false;
        });

        if (!opened) {
            console.log('   Could not find comment box (login may be required)');
            return false;
        }
        await sleep(1500);

        const typed = await page.evaluate((commentText) => {
            const inputs = ['#contenteditable-root', '#comment-input textarea', 'textarea[placeholder*="comment"]', '[contenteditable="true"]'];
            for (const sel of inputs) {
                const el = document.querySelector(sel);
                if (el) {
                    if (el.tagName === 'TEXTAREA') el.value = commentText;
                    else el.textContent = commentText;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                }
            }
            return false;
        }, text);

        if (!typed) { console.log('   Could not find comment input'); return false; }
        await sleep(1000);

        return await page.evaluate(() => {
            const submitBtns = ['#submit-button button', 'ytm-comment-action-buttons-renderer button', 'button[aria-label*="Comment"]'];
            for (const sel of submitBtns) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent !== null && !btn.disabled) { btn.click(); return true; }
            }
            return false;
        });
    } catch (e) {
        console.log('   Comment error:', e.message);
        return false;
    }
}

// Main test
async function main() {
    console.log('='.repeat(60));
    console.log('YouTube Watch Test - Like & Comment');
    console.log('='.repeat(60));
    console.log(`Device: ${DEVICE_SERIAL}`);
    console.log(`Search: "${SEARCH_KEYWORD}"`);
    console.log(`Watch: ${WATCH_SECONDS} seconds`);
    console.log(`Port: ${LOCAL_PORT}\n`);

    // Setup port forwarding
    console.log('Setting up ADB port forwarding...');
    await execAsync(`"${CONFIG.ADB_PATH}" -s ${DEVICE_SERIAL} forward tcp:${LOCAL_PORT} ${CONFIG.SOCKET}`);
    console.log('Port forwarding ready\n');

    let browser;
    try {
        console.log('Connecting to Chrome...');
        browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${LOCAL_PORT}`,
            defaultViewport: null
        });
        console.log('Connected to Chrome\n');

        // Reuse existing page or create new one
        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        // Step 1: Search
        console.log('Step 1: Searching YouTube...');
        const searchUrl = `https://m.youtube.com/results?search_query=${encodeURIComponent(SEARCH_KEYWORD)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(3000);
        await saveScreenshot(page, 'step1-search-results.png');
        console.log('Search completed\n');

        // Step 2: Click first video
        console.log('Step 2: Selecting first video...');
        const clicked = await page.evaluate(() => {
            const selectors = ['ytm-video-with-context-renderer a', 'a.compact-media-item-image', 'ytm-media-item a', '#thumbnail'];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) { el.click(); return true; }
            }
            return false;
        });
        if (!clicked) await page.tap(180, 300);
        await sleep(5000);
        await saveScreenshot(page, 'step2-video-page.png');
        console.log('Video selected\n');

        // Step 3: Handle ads
        console.log('Step 3: Handling ads and starting playback...');
        let adsSkipped = 0;
        for (let i = 0; i < 10; i++) {
            if (await skipAd(page)) { adsSkipped++; console.log(`   Skipped ad #${adsSkipped}`); }
            await sleep(1000);
            const isPlaying = await page.evaluate(() => {
                const video = document.querySelector('video');
                return video && !video.paused && video.currentTime > 0;
            });
            if (isPlaying) break;
            await page.evaluate(() => { const video = document.querySelector('video'); if (video && video.paused) video.play(); });
        }
        await saveScreenshot(page, 'step3-playing.png');
        console.log(`Video playing (ads skipped: ${adsSkipped})\n`);

        // Step 4: Watch
        console.log(`Step 4: Watching for ${WATCH_SECONDS} seconds...`);
        const startTime = Date.now();
        let lastProgress = 0;
        while ((Date.now() - startTime) / 1000 < WATCH_SECONDS) {
            await skipAd(page);
            const progress = await page.evaluate(() => {
                const video = document.querySelector('video');
                return video ? Math.floor(video.currentTime) : 0;
            });
            if (progress !== lastProgress) {
                process.stdout.write(`\r   Progress: ${progress}s / ${WATCH_SECONDS}s target`);
                lastProgress = progress;
            }
            await sleep(2000);
        }
        console.log('\nWatch time completed\n');
        await saveScreenshot(page, 'step4-after-watch.png');

        // Step 5: Like
        console.log('Step 5: Liking video...');
        const liked = await likeVideo(page);
        await sleep(1000);
        await saveScreenshot(page, 'step5-after-like.png');
        console.log(liked ? 'Video liked\n' : 'Like may have failed\n');

        // Step 6: Comment
        console.log('Step 6: Leaving comment...');
        await page.evaluate(() => window.scrollBy(0, 500));
        await sleep(2000);
        const commented = await leaveComment(page, COMMENT_TEXT);
        await sleep(2000);
        await saveScreenshot(page, 'step6-after-comment.png');
        console.log(commented ? 'Comment posted\n' : 'Comment may have failed (login required?)\n');

        // Final
        await saveScreenshot(page, 'final-result.png');
        console.log('='.repeat(60));
        console.log('TEST COMPLETED!');
        console.log('='.repeat(60));
        console.log(`Watch time: ${WATCH_SECONDS}s`);
        console.log(`Ads skipped: ${adsSkipped}`);
        console.log(`Liked: ${liked}`);
        console.log(`Commented: ${commented}`);
        console.log('\nScreenshots saved to logs/ folder');

    } catch (error) {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.disconnect();
    }
}

main();
