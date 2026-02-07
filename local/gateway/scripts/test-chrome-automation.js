#!/usr/bin/env node
/**
 * Chrome Automation Test Script
 *
 * Tests Puppeteer + CDP over ADB on a connected Android device
 */

const { createChromeService } = require('../src/services/chrome');

// Simple console logger
const logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.log('[WARN]', ...args),
    error: (...args) => console.log('[ERROR]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args)
};

// Test configuration
const TEST_DEVICE = process.argv[2] || '314b4e5139593098'; // First USB device
const TEST_URL = 'https://www.youtube.com';

async function main() {
    console.log('═'.repeat(50));
    console.log('Chrome Automation Test');
    console.log('═'.repeat(50));
    console.log(`Device: ${TEST_DEVICE}`);
    console.log(`Test URL: ${TEST_URL}`);
    console.log('');

    // Create Chrome service
    const chromeService = createChromeService({
        logger,
        basePort: 9300,
        maxConnections: 10,
        adbPath: 'C:\\Users\\ChoiJoonho\\adb.exe' // Use user's adb
    });

    try {
        // Start service
        chromeService.start();
        console.log('✅ Chrome service started\n');

        // Step 1: Check if Chrome is installed
        console.log('Step 1: Detecting Chrome on device...');
        const chromePkg = await chromeService.forwarder.detectChromePackage(TEST_DEVICE);
        if (chromePkg) {
            console.log(`✅ Chrome found: ${chromePkg}\n`);
        } else {
            console.log('❌ Chrome not found on device');
            process.exit(1);
        }

        // Step 2: Launch Chrome with debugging
        console.log('Step 2: Launching Chrome with debugging...');
        const launched = await chromeService.forwarder.launchChromeWithDebugging(TEST_DEVICE, chromePkg);
        if (launched) {
            console.log('✅ Chrome launched\n');
        } else {
            console.log('⚠️ Chrome launch may have failed, continuing...\n');
        }

        // Step 3: Setup port forwarding
        console.log('Step 3: Setting up ADB port forwarding...');
        const { localPort, success } = await chromeService.forwarder.forward(TEST_DEVICE);
        if (success) {
            console.log(`✅ Port forwarding: localhost:${localPort} -> device\n`);
        } else {
            console.log('❌ Port forwarding failed');
            process.exit(1);
        }

        // Step 4: Test CDP connection
        console.log('Step 4: Testing CDP connection...');
        await sleep(2000); // Wait for Chrome to be ready

        const connected = await chromeService.forwarder.testConnection(localPort);
        if (connected) {
            console.log('✅ CDP connection successful\n');
        } else {
            console.log('⚠️ CDP not responding - Chrome may need an active tab');
            console.log('   Opening Chrome manually may help...\n');
        }

        // Step 5: Connect with Puppeteer
        console.log('Step 5: Connecting Puppeteer...');
        const browser = await chromeService.connectionManager.connect(TEST_DEVICE);
        console.log('✅ Puppeteer connected\n');

        // Step 6: Navigate to YouTube
        console.log('Step 6: Navigating to YouTube...');
        await chromeService.chromeDriver.navigate(TEST_DEVICE, TEST_URL);
        console.log('✅ Navigated to YouTube\n');

        // Step 7: Wait and take screenshot
        console.log('Step 7: Taking screenshot...');
        await sleep(3000);
        const screenshot = await chromeService.chromeDriver.screenshot(TEST_DEVICE);

        // Save screenshot
        const fs = require('fs');
        const path = require('path');
        const screenshotPath = path.join(__dirname, '../logs/test-screenshot.png');
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        fs.writeFileSync(screenshotPath, screenshot);
        console.log(`✅ Screenshot saved: ${screenshotPath}\n`);

        // Step 8: Get page info
        console.log('Step 8: Getting page info...');
        const title = await chromeService.chromeDriver.getTitle(TEST_DEVICE);
        const url = await chromeService.chromeDriver.getCurrentUrl(TEST_DEVICE);
        console.log(`   Title: ${title}`);
        console.log(`   URL: ${url}\n`);

        // Step 9: YouTube search test
        console.log('Step 9: Testing YouTube search...');
        const searchCount = await chromeService.youtubeWeb.search(TEST_DEVICE, 'cat videos');
        console.log(`✅ Found ${searchCount} search results\n`);

        // Step 10: Take final screenshot
        console.log('Step 10: Taking search results screenshot...');
        await sleep(2000);
        const searchScreenshot = await chromeService.chromeDriver.screenshot(TEST_DEVICE);
        const searchScreenshotPath = path.join(__dirname, '../logs/test-search-screenshot.png');
        fs.writeFileSync(searchScreenshotPath, searchScreenshot);
        console.log(`✅ Screenshot saved: ${searchScreenshotPath}\n`);

        console.log('═'.repeat(50));
        console.log('✅ ALL TESTS PASSED!');
        console.log('═'.repeat(50));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        // Cleanup
        console.log('\nCleaning up...');
        await chromeService.stop();
        console.log('Done.');
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
