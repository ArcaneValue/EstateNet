import { prisma } from './database';

interface WaitForDatabaseOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
}

/**
 * Wait for database to be ready with exponential backoff
 * Returns true when DB is ready, false if max retries exceeded
 */
export const waitForDatabase = async (options: WaitForDatabaseOptions = {}): Promise<boolean> => {
    const {
        maxRetries = 30,
        initialDelay = 500,
        maxDelay = 5000,
        backoffFactor = 1.5
    } = options;

    let currentDelay = initialDelay;
    let attempt = 0;

    console.log('[DB] Waiting for database to be ready...');

    while (attempt < maxRetries) {
        attempt++;
        
        try {
            // Test connection with a simple query
            await prisma.$queryRaw`SELECT 1`;
            console.log(`[DB] Database ready after ${attempt} attempt(s)`);
            return true;
        } catch (error) {
            if (attempt === maxRetries) {
                console.error(`[DB] Failed to connect after ${maxRetries} attempts. Last error:`, error);
                return false;
            }
            
            console.log(`[DB] Attempt ${attempt}/${maxRetries} failed. Retrying in ${currentDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            
            // Exponential backoff
            currentDelay = Math.min(currentDelay * backoffFactor, maxDelay);
        }
    }

    return false;
};

/**
 * Initialize database connection with retry logic
 * Should be called before running any DB-dependent startup tasks
 */
export const initializeDatabase = async (): Promise<boolean> => {
    const ready = await waitForDatabase();
    
    if (!ready) {
        console.error('[DB] Database initialization failed. Server will continue but some features may be limited.');
        // Don't exit the process - allow API to run and retry later
        return false;
    }
    
    console.log('[DB] Database initialized successfully');
    return true;
};
