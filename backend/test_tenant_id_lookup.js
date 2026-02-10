const fs = require('fs');

// Test tenant login and get tenant ID
const loginData = {
    email: "dev.tenant@test.com",
    password: "DevPass123!"
};

fs.writeFileSync('test_tenant_login.json', JSON.stringify(loginData));

const { exec } = require('child_process');

exec('curl.exe -X POST -H "Content-Type: application/json" --data-binary "@test_tenant_login.json" "http://localhost:3001/api/auth/login"', (error, stdout, stderr) => {
    console.log('=== TENANT LOGIN TEST ===');
    console.log('Response:', stdout);
    
    if (stdout.includes('success":true')) {
        console.log('✅ TENANT LOGIN SUCCESSFUL!');
        
        const response = JSON.parse(stdout);
        const token = response.data.token;
        const tenantId = response.data.user.tenantId;
        
        console.log('Tenant ID:', tenantId);
        console.log('User data:', JSON.stringify(response.data.user, null, 2));
        
        // Test manager lookup of tenant ID
        const managerLoginData = {
            email: "dev.manager@test.com",
            password: "DevPass123!"
        };
        
        fs.writeFileSync('test_manager_login.json', JSON.stringify(managerLoginData));
        
        exec('curl.exe -X POST -H "Content-Type: application/json" --data-binary "@test_manager_login.json" "http://localhost:3001/api/auth/login"', (error2, stdout2) => {
            console.log('\n=== MANAGER LOGIN TEST ===');
            
            if (stdout2.includes('success":true')) {
                const managerResponse = JSON.parse(stdout2);
                const managerToken = managerResponse.data.token;
                
                console.log('✅ MANAGER LOGIN SUCCESSFUL!');
                
                // Test tenant ID lookup
                exec(`curl.exe -H "Authorization: Bearer ${managerToken}" "http://localhost:3001/api/identities/${tenantId}"`, (error3, stdout3) => {
                    console.log('\n=== TENANT ID LOOKUP TEST ===');
                    console.log('Response:', stdout3);
                    
                    if (stdout3.includes('success":true')) {
                        console.log('✅ TENANT ID LOOKUP SUCCESSFUL!');
                        const lookupResponse = JSON.parse(stdout3);
                        console.log('Tenant found:', JSON.stringify(lookupResponse.data.identity, null, 2));
                    } else {
                        console.log('❌ TENANT ID LOOKUP FAILED');
                    }
                    
                    // Cleanup
                    fs.unlinkSync('test_tenant_login.json');
                    fs.unlinkSync('test_manager_login.json');
                });
            } else {
                console.log('❌ MANAGER LOGIN FAILED');
                fs.unlinkSync('test_tenant_login.json');
                fs.unlinkSync('test_manager_login.json');
            }
        });
    } else {
        console.log('❌ TENANT LOGIN FAILED');
        fs.unlinkSync('test_tenant_login.json');
    }
});
