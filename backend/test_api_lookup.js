const fs = require('fs');

// Test manager login and tenant lookup
const managerLoginData = {
    email: "dev.manager@test.com",
    password: "DevPass123!"
};

fs.writeFileSync('manager_login.json', JSON.stringify(managerLoginData));

const { exec } = require('child_process');

exec('curl.exe -X POST -H "Content-Type: application/json" --data-binary "@manager_login.json" "http://localhost:3001/api/auth/login"', (error, stdout, stderr) => {
    console.log('=== MANAGER LOGIN TEST ===');
    
    if (stdout.includes('success":true')) {
        const response = JSON.parse(stdout);
        const token = response.data.token;
        
        console.log('✅ MANAGER LOGIN SUCCESSFUL!');
        console.log('Token:', token.substring(0, 20) + '...');
        
        // Test tenant ID lookup with a known tenant ID
        const testTenantIds = ['TN-DVS9TCL8', 'TN-73SXBEDS', 'TN-TR2RI35V'];
        
        testTenantIds.forEach((tenantId, index) => {
            setTimeout(() => {
                exec(`curl.exe -H "Authorization: Bearer ${token}" "http://localhost:3001/api/identities/${tenantId}"`, (error2, stdout2) => {
                    console.log(`\n=== TESTING TENANT ID: ${tenantId} ===`);
                    console.log('Response:', stdout2);
                    
                    if (stdout2.includes('success":true')) {
                        console.log('✅ LOOKUP SUCCESSFUL!');
                    } else {
                        console.log('❌ LOOKUP FAILED');
                    }
                    
                    if (index === testTenantIds.length - 1) {
                        // Cleanup
                        fs.unlinkSync('manager_login.json');
                        console.log('\n=== TEST COMPLETE ===');
                    }
                });
            }, index * 1000); // 1 second delay between requests
        });
    } else {
        console.log('❌ MANAGER LOGIN FAILED');
        console.log('Response:', stdout);
        fs.unlinkSync('manager_login.json');
    }
});
