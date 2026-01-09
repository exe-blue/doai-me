/**
 * Test Dashboard WebSocket Endpoint
 * Tests NodeContext protocol compatibility
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3100/ws/dashboard';
const TIMEOUT = 5000;

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
        console.log('\nReceived message type:', msg.type);

        if (msg.type === 'INIT') {
            console.log('\n--- Node Info ---');
            console.log('  ID:', msg.node.id);
            console.log('  Hostname:', msg.node.hostname);
            console.log('  Status:', msg.node.status);
            console.log('  Devices:', msg.node.deviceCount, '(Online:', msg.node.onlineDeviceCount + ')');
            console.log('  Laixi:', msg.node.laixiConnected ? 'Connected' : 'Not connected');

            console.log('\n--- Devices ---');
            if (msg.devices && msg.devices.length > 0) {
                msg.devices.forEach((d, i) => {
                    console.log(`  [${i + 1}] ${d.serial} - ${d.model} (${d.status})`);
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
