import * as Sentry from '@sentry/react-native';

export interface OTAError {
    code?: string;
    message?: string;
    stack?: string;
}

export interface OTAErrorContext {
    runtimeVersion?: string;
    channel?: string;
    updateStage: 'checking' | 'downloading' | 'applying';
    timestamp: string;
}

/**
 * Log OTA update errors to Sentry with detailed context
 */
export const logOTAError = (
    error: Error | any,
    context: OTAErrorContext
): void => {
    try {
        // Capture to Sentry with full context
        Sentry.captureException(error, {
            tags: {
                update_stage: context.updateStage,
                runtime_version: context.runtimeVersion || 'unknown',
                channel: context.channel || 'unknown',
            },
            contexts: {
                ota_update: {
                    stage: context.updateStage,
                    runtime_version: context.runtimeVersion,
                    channel: context.channel,
                    timestamp: context.timestamp,
                },
            },
            level: 'error',
        });

        // Also log to console for debugging
        console.error('[OTA Error]', {
            error: {
                code: error?.code,
                message: error?.message,
                stack: error?.stack,
            },
            context,
        });
    } catch (loggingError) {
        // Fallback if Sentry fails
        console.error('[OTA Error Logging Failed]', loggingError);
        console.error('[Original OTA Error]', error);
    }
};

/**
 * Extract structured error details from error object
 */
export const extractErrorDetails = (error: any): OTAError => {
    return {
        code: error?.code || error?.name || 'UNKNOWN_ERROR',
        message: error?.message || 'An unexpected error occurred',
        stack: error?.stack,
    };
};

/**
 * Determine if error is recoverable (user can retry)
 */
export const isRecoverableError = (errorCode?: string): boolean => {
    const recoverableErrors = [
        'ERR_UPDATES_FETCH',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
    ];
    return errorCode ? recoverableErrors.includes(errorCode) : true;
};
