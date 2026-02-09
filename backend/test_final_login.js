const fs = require('fs');

// Test login with dev manager
const loginData = {
    email: "dev.manager@test.com",
    password: "DevPass123!"
};

fs.writeFileSync('test_login.json', JSON.stringify(loginData));

const { exec } = require('child_process');

exec('curl.exe -X POST -H "Content-Type: application/json" --data-binary "@test_login.json" "http://localhost:3001/api/auth/login"', (error, stdout, stderr) => {
    console.log('=== DEV MANAGER LOGIN TEST ===');
    console.log('Response:', stdout);
    
    if (stdout.includes('success":true')) {
        console.log('✅ LOGIN SUCCESSFUL!');
        
        // Extract token and test leases
        const response = JSON.parse(stdout);
        const token = response.data.token;
        
        exec(`curl.exe -H "Authorization: Bearer ${token}" "http://localhost:3001/api/manager/leases"`, (error2, stdout2) => {
            console.log('\n=== MANAGER LEASES TEST ===');
            console.log('Response:', stdout2);
            
            if (stdout2.includes('success":true')) {
                console.log('✅ LEASES ACCESS SUCCESSFUL!');
            } else {
                console.log('❌ Leases access failed');
            }
        });
    } else {
        console.log('❌ LOGIN FAILED');
    }
    
    // Cleanup
    fs.unlinkSync('test_login.json');
});
