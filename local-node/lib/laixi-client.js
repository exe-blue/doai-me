const axios = require('axios');

/**
 * Laixi API Client Wrapper
 * Handles communication with the local Laixi server (Phoneboard controller).
 */
class LaixiClient {
    /**
     * @param {string} baseUrl - Laixi API Base URL (default: http://127.0.0.1:9317)
     */
    constructor(baseUrl = 'http://127.0.0.1:9317') {
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: 5000 // 5 seconds timeout
        });
    }

    /**
     * Get list of connected devices
     * @param {string} query - Filter query (e.g., 'online')
     * @returns {Promise<Array>} List of devices
     */
    async getDevices(query = 'online') {
        try {
            const response = await this.client.get('/api/devices', {
                params: { q: query }
            });
            return response.data.data || [];
        } catch (error) {
            console.error(`[Laixi] Failed to get devices: ${error.message}`);
            return [];
        }
    }

    /**
     * Run AutoX.js script on a device
     * @param {string} serial - Device serial number
     * @param {string} script - Script content
     * @param {string} filename - Script filename
     * @param {object} options - Execution options
     */
    async runScript(serial, script, filename = 'intient.js', options = {}) {
        try {
            const response = await this.client.post(`/api/devices/${serial}/script/run`, {
                script: script,
                name: filename,
                options: {
                    keepAlive: false,
                    ...options
                }
            });
            return response.data;
        } catch (error) {
            console.error(`[Laixi] Failed to run script on ${serial}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get script execution status
     * @param {string} serial 
     */
    async getScriptStatus(serial) {
        try {
            const response = await this.client.get(`/api/devices/${serial}/script/status`);
            return response.data;
        } catch (error) {
            // If 404 or error, assume not running or offline
            return { running: false };
        }
    }

    async isScriptRunning(serial) {
        const status = await this.getScriptStatus(serial);
        return status.running === true;
    }

    /**
     * Get detailed information for a specific device.
     * @param {string} serial 
     * @returns {Promise<object|null>} Device details or null
     */
    async getDeviceDetails(serial) {
        try {
            const response = await this.client.get(`/api/devices/${serial}`);
            return response.data; // The API doc suggests the details are in the root of the response
        } catch (error) {
            console.error(`[Laixi] Failed to get details for ${serial}: ${error.message}`);
            return null;
        }
    }
}

module.exports = LaixiClient;