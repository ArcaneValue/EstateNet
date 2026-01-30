@echo off
echo Fixing Prisma Client Generation Issue...
echo.

echo Step 1: Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Removing Prisma client cache...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma"
    echo Prisma cache removed successfully.
) else (
    echo Prisma cache not found.
)

echo Step 3: Regenerating Prisma client...
call npm run db:generate

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Prisma client regenerated successfully!
    echo.
    echo Next steps:
    echo 1. Run: npm run db:migrate -- --name add-lease-model
    echo 2. Run: npm run db:push
    echo 3. Start the development server: npm run dev
) else (
    echo.
    echo FAILED: Prisma client generation failed.
    echo.
    echo Try these solutions:
    echo 1. Restart your computer and run this script again
    echo 2. Run as Administrator
    echo 3. Use a different terminal (Git Bash instead of CMD)
    echo.
    echo See PRISMA_CLIENT_FIX.md for detailed instructions.
)

pause
