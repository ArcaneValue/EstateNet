const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

async function testFrankAdminFlow() {
    try {
        console.log('🧪 Testing admin flow for frank@gmail.com\n');
        console.log('═══════════════════════════════════════════════════════\n');

        // Step 1: Login as Frank
        console.log('Step 1: Logging in as frank@gmail.com...');
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'frank@gmail.com',
                password: 'Ak47grave'
            })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok || !loginData.success) {
            console.log('❌ Login failed:', loginData.message);
            return;
        }

        console.log('✅ Login successful!');
        const token = loginData.data.token;
        console.log('   Token received: Yes');
        console.log('   User role:', loginData.data.user.role);
        console.log('');

        // Step 2: Verify admin credentials
        console.log('Step 2: Verifying admin credentials...');
        const adminVerifyResponse = await fetch(`${API_URL}/auth/admin-verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: 'admin.estatenet@gmail.com',
                password: 'Ak47grave'
            })
        });

        const adminVerifyData = await adminVerifyResponse.json();
        
        if (!adminVerifyResponse.ok || !adminVerifyData.success) {
            console.log('❌ Admin verification failed:', adminVerifyData.message);
            return;
        }

        console.log('✅ Admin credentials verified!');
        console.log('   Admin permissions:', JSON.stringify(adminVerifyData.adminPermissions, null, 2));
        console.log('');

        // Step 3: Access admin analytics endpoint
        console.log('Step 3: Accessing admin analytics endpoint...');
        const analyticsResponse = await fetch(`${API_URL}/admin/feedback/analytics`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const analyticsData = await analyticsResponse.json();
        
        console.log(`   Status: ${analyticsResponse.status} ${analyticsResponse.statusText}`);
        
        if (analyticsResponse.ok) {
            console.log('✅ Analytics endpoint accessible!');
            console.log('   Data received:', JSON.stringify(analyticsData, null, 2));
        } else {
            console.log('❌ Analytics endpoint failed!');
            console.log('   Error:', analyticsData.message);
        }
        console.log('');

        // Step 4: Access admin posts endpoint
        console.log('Step 4: Accessing admin posts endpoint...');
        const postsResponse = await fetch(`${API_URL}/admin/feedback/posts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const postsData = await postsResponse.json();
        
        console.log(`   Status: ${postsResponse.status} ${postsResponse.statusText}`);
        
        if (postsResponse.ok) {
            console.log('✅ Posts endpoint accessible!');
            console.log(`   Posts count: ${postsData.data?.posts?.length || 0}`);
        } else {
            console.log('❌ Posts endpoint failed!');
            console.log('   Error:', postsData.message);
        }
        console.log('');

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 Test Summary:');
        console.log(`   Login: ${loginResponse.ok ? '✅' : '❌'}`);
        console.log(`   Admin Verification: ${adminVerifyResponse.ok ? '✅' : '❌'}`);
        console.log(`   Analytics Endpoint: ${analyticsResponse.ok ? '✅' : '❌'}`);
        console.log(`   Posts Endpoint: ${postsResponse.ok ? '✅' : '❌'}`);
        console.log('═══════════════════════════════════════════════════════\n');

        if (analyticsResponse.ok && postsResponse.ok) {
            console.log('🎉 All tests passed! No 403 errors detected.');
        } else {
            console.log('⚠️  Some tests failed. Check the errors above.');
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testFrankAdminFlow();
