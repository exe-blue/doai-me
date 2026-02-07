/**
 * Test Dashboard WebSocket Endpoint
 * Tests NodeContext protocol compatibility
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3100/ws/dashboard';
const TIMEOUT = 5000;

/**
 * Sanitize string for safe logging (prevent log injection)
 * @param {*} value - Value to sanitize
 * @returns {string} Sanitized string
 */
function sanitize(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/\r\n/g, '\\r\\n')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

console.log('\n=== Dashboard WebSocket Test ===\n');
console.log('Connecting to:', WS_URL);

const ws = new WebSocket(WS_URL);

const timeout = setTimeout(() => {
    console.log('\x1b[31mTIMEOUT\x1b[0m - No response received');
    ws.close();
    process.exit(1);
}, TIMEOUT);

ws.on('open', () => {
    console.log('\x1b[32mCONNECTED\x1b[0m');
});

ws.on('message', (data) => {
    clearTimeout(timeout);
    try {
        const msg = JSON.parse(data.toString());
        console.log('\nReceived message type:', sanitize(msg.type));

        if (msg.type === 'INIT') {
            console.log('\n--- Node Info ---');
            console.log('  ID:', sanitize(msg.node?.id));
            console.log('  Hostname:', sanitize(msg.node?.hostname));
            console.log('  Status:', sanitize(msg.node?.status));
            console.log('  Devices:', sanitize(msg.node?.deviceCount), '(Online:', sanitize(msg.node?.onlineDeviceCount) + ')');
            console.log('  Laixi:', msg.node?.laixiConnected ? 'Connected' : 'Not connected');

            console.log('\n--- Devices ---');
            if (msg.devices && msg.devices.length > 0) {
                msg.devices.forEach((d, i) => {
                    console.log(`  [${i + 1}] ${sanitize(d.serial)} - ${sanitize(d.model)} (${sanitize(d.status)})`);
                });
            } else {
                console.log('  No devices');
            }

            console.log('\n\x1b[32mSUCCESS\x1b[0m - NodeContext protocol working!\n');
        } else {
            console.log('Payload:', JSON.stringify(msg, null, 2).slice(0, 500));
        }

        ws.close();
        process.exit(0);
    } catch (e) {
        console.log('Failed to parse message:', e.message);
        ws.close();
        process.exit(1);
    }
});

ws.on('error', (err) => {
    clearTimeout(timeout);
    console.log('\x1b[31mERROR\x1b[0m:', err.message);
    process.exit(1);
});

ws.on('close', () => {
    console.log('Connection closed');
});
