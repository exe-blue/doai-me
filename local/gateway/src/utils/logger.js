/**
 * Logger Utility
 * Winston 기반 로깅
 * 
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const winston = require('winston');

class Logger {
    constructor(level = 'info') {
        this.logger = winston.createLogger({
            level,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length 
                        ? JSON.stringify(meta) 
                        : '';
                    return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
                })
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp({ format: 'HH:mm:ss' }),
                        winston.format.printf(({ timestamp, level, message, ...meta }) => {
                            const metaStr = Object.keys(meta).length 
                                ? JSON.stringify(meta) 
                                : '';
                            return `${timestamp} ${level} ${message} ${metaStr}`;
                        })
                    )
                }),
                new winston.transports.File({ 
                    filename: 'logs/error.log', 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: 'logs/combined.log' 
                })
            ]
        });
    }

    /**
     * Sanitize log message to prevent log injection
     * Removes/escapes newlines and control characters
     * @param {string} message - Message to sanitize
     * @returns {string} Sanitized message
     */
    _sanitize(message) {
        if (typeof message !== 'string') {
            return String(message);
        }
        // Replace newlines with escaped representation, remove other control chars
        return message
            .replace(/\r\n/g, '\\r\\n')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    info(message, meta = {}) {
        this.logger.info(this._sanitize(message), meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(this._sanitize(message), meta);
    }

    error(message, meta = {}) {
        this.logger.error(this._sanitize(message), meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(this._sanitize(message), meta);
    }
}

module.exports = Logger;

