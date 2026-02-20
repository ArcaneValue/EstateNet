-- Add unique constraint for invoices to prevent duplicates
-- Add job_locks table for multi-instance safety

-- 1) Add unique constraint to invoices
ALTER TABLE invoices 
ADD CONSTRAINT unique_manager_billing_period 
UNIQUE (managerId, periodStart, periodEnd);

-- 2) Create job_locks table for distributed locking
CREATE TABLE job_locks (
    id TEXT PRIMARY KEY,
    job_name TEXT UNIQUE NOT NULL,
    locked_until TIMESTAMP NOT NULL,
    locked_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for performance
CREATE INDEX idx_job_locks_name_until ON job_locks(job_name, locked_until);

-- Add update trigger for updated_at (PostgreSQL)
CREATE OR REPLACE FUNCTION update_job_locks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_job_locks_updated_at_trigger
    BEFORE UPDATE ON job_locks
    FOR EACH ROW
    EXECUTE FUNCTION update_job_locks_updated_at();
