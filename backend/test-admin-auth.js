const fetch = require('node-fetch');

async function testAdminAuth() {
    try {
        console.log('🧪 Testing Admin Authentication Flow\n');

        // Step 1: Login as regular user first
        console.log('Step 1: Logging in as admin.estatenet@gmail.com...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin.estatenet@gmail.com',
                password: 'Ak47grave'
            })
        });

        const loginData = await loginResponse.json();

        if (!loginData.success) {
            console.log('❌ Login failed:', loginData.message);
            return;
        }

        console.log('✅ Login successful!');
        console.log('   Token received:', loginData.data?.token ? 'Yes' : 'No');
        const token = loginData.data.token;

        // Step 2: Test admin analytics endpoint
        console.log('\nStep 2: Testing admin analytics endpoint...');
        const analyticsResponse = await fetch('http://localhost:3001/api/admin/feedback/analytics', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('   Status:', analyticsResponse.status, analyticsResponse.statusText);

        if (analyticsResponse.status === 200) {
            const analyticsData = await analyticsResponse.json();
            console.log('✅ Analytics endpoint SUCCESS!');
            console.log('   Data:', JSON.stringify(analyticsData, null, 2));
        } else {
            const errorData = await analyticsResponse.json();
            console.log('❌ Analytics endpoint FAILED!');
            console.log('   Error:', errorData.message);
        }

        // Step 3: Test admin posts endpoint
        console.log('\nStep 3: Testing admin posts endpoint...');
        const postsResponse = await fetch('http://localhost:3001/api/admin/feedback/posts', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('   Status:', postsResponse.status, postsResponse.statusText);

        if (postsResponse.status === 200) {
            const postsData = await postsResponse.json();
            console.log('✅ Posts endpoint SUCCESS!');
            console.log('   Posts found:', postsData.posts ? postsData.posts.length : 0);
        } else {
            const errorData = await postsResponse.json();
            console.log('❌ Posts endpoint FAILED!');
            console.log('   Error:', errorData.message);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testAdminAuth();
