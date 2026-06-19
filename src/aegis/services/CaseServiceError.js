'use strict';

/**
 * @fileoverview CaseServiceError
 * Structured error class thrown by CaseService for user-facing validation
 * and pre-flight check failures.
 *
 * Caught by command run() methods and returned ephemerally to the user.
 */

class CaseServiceError extends Error {
    /**
     * @param {string} code     Error code (e.g. 'AEGIS_DISABLED')
     * @param {string} message  User-facing error message
     */
    constructor(code, message) {
        super(message);
        this.name = 'CaseServiceError';
        this.code = code;
    }
}

module.exports = CaseServiceError;
