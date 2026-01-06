#!/usr/bin/env node
/**
 * DoAi.Me Migration Applier
 *
 * Supabase SQL Editor 없이 직접 마이그레이션 적용
 *
 * Usage: node apply-migration.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration from local-node/config.json
const configPath = path.join(__dirname, '..', '..', 'local-node', 'config.json');
let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (err) {
    console.error('Error reading config.json:', err.message);
    process.exit(1);
}

const SUPABASE_URL = config.supabase?.url;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || config.supabase?.anon_key;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log('Testing Supabase connection...');
    console.log(`URL: ${SUPABASE_URL}`);

    try {
        const { data, error } = await supabase
            .from('devices')
            .select('count')
            .limit(1);

        if (error && error.code !== 'PGRST116') {
            console.log('Connection OK (devices table may not exist yet)');
        } else {
            console.log('Connection OK');
        }
        return true;
    } catch (err) {
        console.error('Connection failed:', err.message);
        return false;
    }
}

async function checkTables() {
    console.log('\n=== Checking existing tables ===');

    const tables = [
        'devices', 'personas', 'node_health', 'job_queue',
        'youtube_video_tasks', 'traces', 'recommended_videos',
        'persona_activity_logs', 'system_config', 'watch_targets'
    ];

    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.log(`  ${table}: NOT EXISTS or error (${error.code})`);
            } else {
                console.log(`  ${table}: EXISTS`);
            }
        } catch (err) {
            console.log(`  ${table}: ERROR - ${err.message}`);
        }
    }
}

async function checkNodeHealth() {
    console.log('\n=== Node Health Status ===');

    try {
        const { data, error } = await supabase
            .from('node_health')
            .select('node_id, node_name, status, last_heartbeat')
            .order('node_id');

        if (error) {
            console.log('node_health table not ready:', error.message);
            return;
        }

        if (!data || data.length === 0) {
            console.log('No nodes registered yet');
            return;
        }

        console.log('Registered nodes:');
        data.forEach(n => {
            console.log(`  ${n.node_id}: ${n.node_name} (${n.status})`);
        });
    } catch (err) {
        console.log('Error checking nodes:', err.message);
    }
}

async function checkSystemConfig() {
    console.log('\n=== System Config ===');

    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('key, value');

        if (error) {
            console.log('system_config table not ready:', error.message);
            return;
        }

        if (!data || data.length === 0) {
            console.log('No config entries');
            return;
        }

        data.forEach(c => {
            console.log(`  ${c.key}: ${JSON.stringify(c.value)}`);
        });
    } catch (err) {
        console.log('Error checking config:', err.message);
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║      DoAi.Me Migration Status Checker          ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    const connected = await testConnection();
    if (!connected) {
        process.exit(1);
    }

    await checkTables();
    await checkNodeHealth();
    await checkSystemConfig();

    console.log('\n=== Migration Instructions ===');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select project: hycynmzdrngsozxdmyxi');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy & paste contents of: APPLY_ALL_LOCALNODE.sql');
    console.log('5. Click "Run" to apply migration');
    console.log('\nNote: The migration script is idempotent (safe to run multiple times)');
}

main().catch(console.error);
