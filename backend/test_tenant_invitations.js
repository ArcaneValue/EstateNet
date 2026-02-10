const fs = require('fs');

// Test tenant login
const loginData = {
    email: "dev.tenant@test.com",
    password: "DevPass123!"
};

fs.writeFileSync('tenant_login.json', JSON.stringify(loginData));

const { exec } = require('child_process');

exec('curl.exe -X POST -H "Content-Type: application/json" --data-binary "@tenant_login.json" "http://localhost:3001/api/auth/login"', (error, stdout, stderr) => {
    console.log('=== DEV TENANT LOGIN TEST ===');
    console.log('Response:', stdout);
    
    if (stdout.includes('success":true')) {
        console.log('✅ TENANT LOGIN SUCCESSFUL!');
        
        // Extract token and test invitations
        const response = JSON.parse(stdout);
        const token = response.data.token;
        
        exec(`curl.exe -H "Authorization: Bearer ${token}" "http://localhost:3001/api/tenants/invitations"`, (error2, stdout2) => {
            console.log('\n=== TENANT INVITATIONS TEST ===');
            console.log('Response:', stdout2);
            
            if (stdout2.includes('success":true')) {
                console.log('✅ INVITATIONS ACCESS SUCCESSFUL!');
                
                const invitationsResponse = JSON.parse(stdout2);
                console.log(`Found ${invitationsResponse.data.length} invitations`);
                
                if (invitationsResponse.data.length > 0) {
                    const invitation = invitationsResponse.data[0];
                    console.log('First invitation:', {
                        id: invitation.id,
                        property: invitation.property.name,
                        unit: invitation.unit.unitNumber,
                        rentAmount: invitation.rentAmount,
                        status: invitation.status
                    });
                }
            } else {
                console.log('❌ Invitations access failed');
            }
        });
    } else {
        console.log('❌ TENANT LOGIN FAILED');
    }
    
    // Cleanup
    fs.unlinkSync('tenant_login.json');
});
