#!/usr/bin/env node
/**
 * YouTube Parallel Test with Auto Device Discovery
 *
 * Runs YouTube watch tests on multiple devices simultaneously
 * Usage: node scripts/test-youtube-parallel.js [watchSeconds] [maxDevices]
 */

const { exec, execSync } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
    ADB_PATH: process.platform === 'win32' ? 'C:\\Users\\ChoiJoonho\\adb.exe' : 'adb',
    WATCH_SECONDS: parseInt(process.argv[2]) || 15,
    MAX_DEVICES: parseInt(process.argv[3]) || 10,
    SCRIPT_PATH: path.join(__dirname, 'test-youtube-watch.js'),
    // Timeouts
    USB_CHROME_WAIT: 2000,
    WIFI_CHROME_WAIT: 5000,
    USB_TIMEOUT: 120000,
    WIFI_TIMEOUT: 180000
};

// Search keywords rotation
const SEARCH_KEYWORDS = [
    'funny cats', 'cute dogs', 'baby animals', 'cat fails',
    'dog compilation', 'kitten playing', 'puppy videos', 'animal moments',
    'pets being funny', 'cat vs dog', 'adorable kittens', 'golden retriever'
];

function getRandomSearch() {
    return SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
}

function isWifiDevice(serial) {
    return serial.includes(':');
}

function discoverDevices() {
    try {
        const output = execSync(`"${CONFIG.ADB_PATH}" devices -l`, { encoding: 'utf8', shell: true });
        const lines = output.split('\n').slice(1);

        const devices = [];
        for (const line of lines) {
            const match = line.match(/^(\S+)\s+device\s+/);
            if (match) {
                const serial = match[1];
                const modelMatch = line.match(/model:(\S+)/);
                const model = modelMatch ? modelMatch[1] : 'unknown';
                const isWifi = isWifiDevice(serial);
                devices.push({ serial, model, isWifi });
            }
        }
        return devices;
    } catch (e) {
        console.error('Failed to discover devices:', e.message);
        return [];
    }
}

function launchChrome(serial) {
    const timeout = isWifiDevice(serial) ? 20000 : 10000;
    return new Promise((resolve) => {
        const cmd = `"${CONFIG.ADB_PATH}" -s "${serial}" shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -d "about:blank" --activity-clear-task`;
        exec(cmd, { timeout, shell: true }, (err) => {
            resolve(!err);
        });
    });
}

function setupPortForward(serial, port) {
    const timeout = isWifiDevice(serial) ? 15000 : 5000;
    return new Promise((resolve) => {
        const cmd = `"${CONFIG.ADB_PATH}" -s "${serial}" forward tcp:${port} localabstract:chrome_devtools_remote`;
        exec(cmd, { timeout, shell: true }, (err) => {
            resolve(!err);
        });
    });
}

async function runTest(device, index, total) {
    const search = getRandomSearch();
    const port = 9300 + index;
    const startTime = Date.now();
    const isWifi = device.isWifi;
    const deviceType = isWifi ? 'WiFi' : 'USB';

    console.log(`[${index + 1}/${total}] ${device.serial} (${device.model}) [${deviceType}]`);
    console.log(`        Search: "${search}" | Port: ${port}`);

    // Launch Chrome with appropriate wait time
    await launchChrome(device.serial);
    const chromeWait = isWifi ? CONFIG.WIFI_CHROME_WAIT : CONFIG.USB_CHROME_WAIT;
    await new Promise(r => setTimeout(r, chromeWait));

    // Setup port forwarding
    const forwardOk = await setupPortForward(device.serial, port);
    if (!forwardOk) {
        console.log(`        Port forward failed, retrying...`);
        await new Promise(r => setTimeout(r, 2000));
        await setupPortForward(device.serial, port);
    }

    // Extra wait for WiFi devices
    if (isWifi) {
        await new Promise(r => setTimeout(r, 2000));
    }

    const testTimeout = isWifi ? CONFIG.WIFI_TIMEOUT : CONFIG.USB_TIMEOUT;

    return new Promise((resolve) => {
        const cmd = `node "${CONFIG.SCRIPT_PATH}" "${device.serial}" "${search}" ${CONFIG.WATCH_SECONDS} "${port}"`;

        exec(cmd, { timeout: testTimeout, shell: true }, (err, stdout) => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            const success = !err && stdout.includes('TEST COMPLETED');

            // Extract metrics
            const progressMatch = stdout.match(/Progress: (\d+)s/g);
            const watchedSeconds = progressMatch
                ? progressMatch[progressMatch.length - 1].match(/\d+/)[0]
                : '0';

            const liked = stdout.includes('Liked: true');
            const commented = stdout.includes('Commented: true');

            resolve({
                index: index + 1,
                serial: device.serial,
                model: device.model,
                isWifi,
                search,
                success,
                duration,
                watchedSeconds,
                liked,
                commented,
                error: err ? err.message.split('\n')[0] : null
            });
        });
    });
}

async function main() {
    console.log('='.repeat(60));
    console.log('YouTube Parallel Test - Auto Discovery');
    console.log('='.repeat(60));

    // Discover devices
    console.log('Discovering devices...');
    const allDevices = discoverDevices();

    if (allDevices.length === 0) {
        console.log('No devices found!');
        process.exitCode = 1;
        return;
    }

    // Limit devices if needed
    const devices = allDevices.slice(0, CONFIG.MAX_DEVICES);

    const usbCount = devices.filter(d => !d.isWifi).length;
    const wifiCount = devices.filter(d => d.isWifi).length;

    console.log(`Found: ${allDevices.length} devices (${usbCount} USB, ${wifiCount} WiFi)`);
    if (allDevices.length > CONFIG.MAX_DEVICES) {
        console.log(`Using: ${devices.length} (max limit)`);
    }
    console.log(`Watch time: ${CONFIG.WATCH_SECONDS}s per device`);
    console.log('='.repeat(60));

    // Launch Chrome on all devices first
    console.log('\nLaunching Chrome on all devices...');
    await Promise.all(devices.map(d => launchChrome(d.serial)));

    // Wait for Chrome to initialize (longer for WiFi)
    const hasWifi = wifiCount > 0;
    const initWait = hasWifi ? 8000 : 5000;
    console.log(`Waiting ${initWait / 1000}s for Chrome to initialize...`);
    await new Promise(r => setTimeout(r, initWait));

    console.log('Starting tests...\n');

    const startTime = Date.now();

    // Run all tests in parallel
    const results = await Promise.all(
        devices.map((device, index) => runTest(device, index, devices.length))
    );

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const successCount = results.filter(r => r.success).length;
    const usbSuccess = results.filter(r => r.success && !r.isWifi).length;
    const wifiSuccess = results.filter(r => r.success && r.isWifi).length;

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log(`RESULTS (${totalTime}s total)`);
    console.log('='.repeat(60));

    results.forEach(r => {
        const status = r.success ? 'OK  ' : 'FAIL';
        const type = r.isWifi ? 'WiFi' : 'USB ';
        const extras = [];
        if (r.liked) extras.push('liked');
        if (r.commented) extras.push('commented');
        const extrasStr = extras.length ? ` [${extras.join(', ')}]` : '';

        console.log(`[${r.index}] ${status} [${type}] ${r.serial}`);
        console.log(`         Watched: ${r.watchedSeconds}s | Time: ${r.duration}s${extrasStr}`);
        if (!r.success && r.error) {
            console.log(`         Error: ${r.error.substring(0, 80)}`);
        }
    });

    console.log('='.repeat(60));
    console.log(`Success: ${successCount}/${devices.length} (USB: ${usbSuccess}/${usbCount}, WiFi: ${wifiSuccess}/${wifiCount})`);
    console.log(`Total time: ${totalTime}s`);
    if (devices.length > 1) {
        console.log(`Efficiency: ${(totalTime / devices.length).toFixed(1)}s avg per device`);
    }
    console.log('='.repeat(60));

    process.exitCode = successCount === devices.length ? 0 : 1;
}

main();
