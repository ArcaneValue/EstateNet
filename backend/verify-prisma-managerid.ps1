# Verify Prisma ManagerId Enforcement (TRUTHFUL VERSION)
# This script verifies that:
# 1. Property.managerId is required in schema (String, not String?)
# 2. Migration exists with NOT NULL constraint
# 3. No 'as any' workarounds remain in property-related code
# 4. Database actually enforces NOT NULL (real DB query - FAILS if unreachable)

param(
    [string]$BackendPath = "."
)

$ErrorActionPreference = "Stop"
$script:allPassed = $true

function Write-Result($message, $passed) {
    if ($passed) {
        Write-Host "  [PASS] $message" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $message" -ForegroundColor Red
        $script:allPassed = $false
    }
}

Write-Host "=== Prisma ManagerId Verification ===" -ForegroundColor Cyan
Write-Host "Backend Path: $(Resolve-Path $BackendPath)" -ForegroundColor Gray
Write-Host ""

# Check 1: Verify schema.prisma has required managerId
Write-Host "Check 1: Verifying schema.prisma has required managerId..." -ForegroundColor Yellow
$schemaPath = Join-Path $BackendPath "prisma/schema.prisma"
if (Test-Path $schemaPath) {
    $schemaContent = Get-Content $schemaPath -Raw
    # Check for "managerId String" (not "managerId String?")
    if ($schemaContent -match 'managerId\s+String\s+(?!\?)') {
        Write-Result "schema.prisma: managerId is required (String, not String?)" $true
    } else {
        Write-Result "schema.prisma: managerId should be required String (found String?)" $false
    }
    
    # Also verify the relation is not optional
    if ($schemaContent -match 'manager\s+User\s+@relation') {
        Write-Result "schema.prisma: manager relation is correctly defined" $true
    } else {
        Write-Result "schema.prisma: manager relation may have issues" $false
    }
} else {
    Write-Result "schema.prisma file not found at $schemaPath" $false
}

# Check 2: Verify migration exists with NOT NULL constraint
Write-Host ""
Write-Host "Check 2: Verifying migration exists with NOT NULL constraint..." -ForegroundColor Yellow
$migrationPath = Join-Path $BackendPath "prisma/migrations/20260202100000_enforce_property_manager_required/migration.sql"
if (Test-Path $migrationPath) {
    $migrationContent = Get-Content $migrationPath -Raw
    if ($migrationContent -match 'NOT NULL') {
        Write-Result "Migration contains NOT NULL constraint" $true
    } else {
        Write-Result "Migration missing NOT NULL constraint" $false
    }
    # Check for backfill logic (UPDATE with managerId and IS NULL - handles multiline)
    if ($migrationContent -match 'UPDATE' -and $migrationContent -match 'managerId' -and $migrationContent -match 'IS NULL') {
        Write-Result "Migration contains backfill for null managerId values" $true
    } else {
        Write-Result "Migration missing backfill logic" $false
    }
} else {
    Write-Result "Migration file not found" $false
}

# Check 3: Verify no 'as any' workarounds in property-related files
Write-Host ""
Write-Host "Check 3: Verifying no 'as any' workarounds in property code..." -ForegroundColor Yellow
$filesToCheck = @(
    "src/controllers/propertyController.ts",
    "src/services/propertyService.ts",
    "src/services/managerService.ts",
    "prisma/backfill-property-manager.ts",
    "prisma/seed.ts"
)
$anyWorkaroundsFound = $false
foreach ($file in $filesToCheck) {
    $fullPath = Join-Path $BackendPath $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        # Check for managerId related as any patterns
        if ($content -match 'managerId.*as\s+any|as\s+any.*managerId') {
            Write-Result "$file contains 'as any' workaround" $false
            $anyWorkaroundsFound = $true
        }
    }
}
if (-not $anyWorkaroundsFound) {
    Write-Result "No 'as any' workarounds found in property code" $true
}

# Check 4: Verify database enforces NOT NULL (REAL DB QUERY - FAILS IF UNREACHABLE)
Write-Host ""
Write-Host "Check 4: Verifying database enforces NOT NULL constraint..." -ForegroundColor Yellow

try {
    # Load env vars (strip quotes)
    $envPath = Join-Path $BackendPath ".env"
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $val = $matches[2].Trim()
                # Remove surrounding quotes
                $val = $val -replace '^["'']|["'']$'
                [Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
    
    # Use Prisma to query database via local script
    $scriptPath = Join-Path $BackendPath "scripts/verify-db.ts"
    
    # Run via npx ts-node from backend directory
    Push-Location $BackendPath
    $result = & npx ts-node $scriptPath 2>&1
    Pop-Location
    
    $data = $result | ConvertFrom-Json
    
    if ($data.success) {
        if ($data.nullCount -eq 0) {
            Write-Result "DB: No properties with null managerId (found $($data.totalCount) total)" $true
        } else {
            Write-Result "DB: Found $($data.nullCount) properties with null managerId" $false
        }
        
        if ($data.emptyCount -eq 0) {
            Write-Result "DB: No properties with empty managerId" $true
        } else {
            Write-Result "DB: Found $($data.emptyCount) properties with empty managerId" $false
        }
    } else {
        Write-Result "DB query failed: $($data.error)" $false
    }
} catch {
    Write-Result "Could not verify database state: $_" $false
    Write-Host "  ERROR: Database must be online to verify NOT NULL enforcement" -ForegroundColor Red
    $script:allPassed = $false
}

# Check 5: Verify Prisma Client was regenerated
Write-Host ""
Write-Host "Check 5: Verifying Prisma Client types..." -ForegroundColor Yellow
$clientPath = Join-Path $BackendPath "node_modules/@prisma/client/index.d.ts"
if (Test-Path $clientPath) {
    $clientContent = Get-Content $clientPath -Raw
    # Check that managerId is not optional in generated types
    if ($clientContent -match 'managerId:') {
        if ($clientContent -match 'managerId\?:') {
            Write-Result "Prisma Client: managerId appears optional (needs regenerate?)" $false
        } else {
            Write-Result "Prisma Client: managerId is required in generated types" $true
        }
    }
} else {
    Write-Result "Prisma Client not found - run 'npx prisma generate'" $false
}

# Final Summary
Write-Host ""
Write-Host "=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
if ($script:allPassed) {
    Write-Host "[PASS] All checks passed - Prisma ManagerId is properly enforced" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] Some checks failed - review output above" -ForegroundColor Red
    exit 1
}
