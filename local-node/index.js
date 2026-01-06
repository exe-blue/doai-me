/**
 * DoAi.Me Local Node Service (Heartbeat & Orchestrator)
 * Task 5 Implementation
 * 
 * Role:
 * - Bridges Supabase (Cloud) and Laixi (Local Devices)
 * - Manages device lifecycle and task execution
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Configuration ---
const CallbackServer = require('./lib/callback-server');
const LaixiClient = require('./lib/laixi-client');
const LAIXI_API_URL = process.env.LAIXI_API_URL || 'http://127.0.0.1:9317';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CALLBACK_PORT = process.env.CALLBACK_PORT || 3000;
const NODE_ID = process.env.NODE_ID || os.hostname();

// --- Clients ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- State Management ---
const DeviceState = new Map(); // serial -> { taskId, startTime }

// --- Helper: Get Local IP ---
function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return '127.0.0.1';
}
const CALLBACK_URL = `http://${getLocalIp()}:${CALLBACK_PORT}/callback`;

// --- Laixi API Wrapper ---
const laixi = new LaixiClient(LAIXI_API_URL);

// --- Core Logic ---
async function processDevice(device) {
    const serial = device.serial || device.id;
    
    // 1. Heartbeat (RPC: device_heartbeat)
    const { error: hbError } = await supabase.rpc('device_heartbeat', {
        p_node_id: NODE_ID,
        p_device_serial: serial,
        p_status: 'online',
        p_battery: device.battery || device.batteryLevel || 100
    });

    if (hbError) console.error(`[Heartbeat] Error for ${serial}:`, hbError.message);

    // 2. Check Device Status
    const isRunningInLaixi = await laixi.isScriptRunning(serial);
    
    if (DeviceState.has(serial)) {
        if (!isRunningInLaixi) {
            // Task finished but callback might be missing or delayed.
            // We clear state to allow recovery.
            console.log(`[${serial}] Task ended in Laixi. Clearing local state.`);
            DeviceState.delete(serial);
        }
        return; // Device is busy
    }

    if (isRunningInLaixi) return; // Device busy with unknown task

    // 3. Fetch Next Task (RPC: get_next_task_for_device)
    const { data: task, error: taskError } = await supabase
        .rpc('get_next_task_for_device', { p_device_serial: serial });

    if (task) {
        console.log(`[${serial}] Assigning Task ${task.id}: ${task.video_title}`);
        
        // 4. Prepare Script
        const scriptPath = path.join(__dirname, 'scripts', 'intient.js');
        if (!fs.existsSync(scriptPath)) {
            console.error(`Script not found: ${scriptPath}`);
            return;
        }
        
        const scriptTemplate = fs.readFileSync(scriptPath, 'utf8');
        const envInjection = `
            var $env = {
                TASK_ID: "${task.id}",
                VIDEO_URL: "${task.video_url}",
                TARGET_DURATION: ${task.target_duration || 60},
                SHOULD_LIKE: ${task.should_like || false},
                SHOULD_COMMENT: ${task.should_comment || false},
                SHOULD_SUBSCRIBE: ${task.should_subscribe || false},
                COMMENT_TEXT: "${task.comment_text || ''}",
                CALLBACK_URL: "${CALLBACK_URL}"
            };
        `;
        const finalScript = envInjection + "\n" + scriptTemplate;

        // 5. Run Script
        const success = await Laixi.runScript(serial, finalScript);
        
        if (success) {
            DeviceState.set(serial, { taskId: task.id, startTime: Date.now() });
        }
    }
}

async function processSystemJobs() {
    try {
        // 1. Fetch System Job (RPC: assign_next_job)
        const { data: jobs, error } = await supabase.rpc('assign_next_job', { p_node_id: NODE_ID });
        
        if (error) {
            console.error(`[SystemJob] Fetch error: ${error.message}`);
            return;
        }

        if (jobs && jobs.length > 0) {
            const job = jobs[0];
            console.log(`[SystemJob] Processing ${job.job_type} (${job.job_id})`);

            let success = false;
            let result = {};
            let errorMessage = null;

            if (job.job_type === 'DEVICE_SCREENSHOT') {
                const serial = job.target_device;
                const imageBuffer = await laixi.takeScreenshot(serial);
                
                if (imageBuffer) {
                    const filename = `${serial}_${Date.now()}.png`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('screenshots')
                        .upload(filename, imageBuffer, { contentType: 'image/png' });
                    
                    if (!uploadError) {
                        success = true;
                        result = { url: uploadData.path };
                    } else {
                        errorMessage = uploadError.message;
                    }
                } else {
                    errorMessage = "Failed to capture screenshot from device";
                }
            }

            // Complete Job
            await supabase.rpc('complete_job', {
                p_job_id: job.job_id,
                p_success: success,
                p_result: result,
                p_error_message: errorMessage
            });
        }
    } catch (e) {
        console.error(`[SystemJob] Error: ${e.message}`);
    }
}

async function loop() {
    // 1. Process System Jobs (High Priority)
    await processSystemJobs();

    // 2. Process Device Tasks
    const devices = await laixi.getDevices();
    console.log(`[Heartbeat] Connected Devices: ${devices.length}`);
    for (const device of devices) {
        await processDevice(device);
    }
}

// --- Start ---
const callbackServer = new CallbackServer(CALLBACK_PORT, supabase, DeviceState);
callbackServer.start();

console.log(`📡 Callback URL: ${CALLBACK_URL}`);
setInterval(loop, 10000); // 10 seconds interval
loop();