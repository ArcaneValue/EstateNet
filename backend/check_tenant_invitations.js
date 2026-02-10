const fs = require('fs');

// Test tenant login and check invitations
const tenantLoginData = {
    email: "dev.tenant@test.com",
    password: "DevPass123!"
};

fs.writeFileSync('tenant_login_check.json', JSON.stringify(tenantLoginData));

const { exec } = require('child_process');

exec('curl.exe -X POST -H "Content-Type: application/json" --data-binary "@tenant_login_check.json" "http://localhost:3001/api/auth/login"', (error, stdout, stderr) => {
    console.log('=== TENANT LOGIN TEST ===');
    
    if (stdout.includes('success":true')) {
        const response = JSON.parse(stdout);
        const token = response.data.token;
        
        console.log('✅ TENANT LOGIN SUCCESSFUL!');
        
        // Check tenant invitations
        exec(`curl.exe -H "Authorization: Bearer ${token}" "http://localhost:3001/api/tenants/invitations"`, (error2, stdout2) => {
            console.log('\n=== CHECKING TENANT INVITATIONS ===');
            console.log('Response:', stdout2);
            
            if (stdout2.includes('success":true')) {
                const invitationsResponse = JSON.parse(stdout2);
                console.log(`✅ Found ${invitationsResponse.data.length} invitations!`);
                
                if (invitationsResponse.data.length > 0) {
                    console.log('\n📋 INVITATION DETAILS:');
                    invitationsResponse.data.forEach((invitation, index) => {
                        console.log(`${index + 1}. Property: ${invitation.property.name}`);
                        console.log(`   Unit: ${invitation.unit.unitNumber}`);
                        console.log(`   Rent: UGX ${invitation.rentAmount}`);
                        console.log(`   Status: ${invitation.status}`);
                        console.log(`   Created: ${invitation.createdAt}`);
                        console.log('');
                    });
                } else {
                    console.log('❌ No invitations found for tenant');
                }
            } else {
                console.log('❌ Failed to get invitations');
            }
            
            // Cleanup
            fs.unlinkSync('tenant_login_check.json');
        });
    } else {
        console.log('❌ TENANT LOGIN FAILED');
        console.log('Response:', stdout);
        fs.unlinkSync('tenant_login_check.json');
    }
});
