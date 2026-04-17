const fetch = require('node-fetch');

async function testLoginDirect() {
    try {
        console.log('🧪 Testing login endpoint directly\n');
        
        const url = 'http://localhost:3001/api/auth/login';
        const body = {
            email: 'admin.estatenet@gmail.com',
            password: 'Ak47grave'
        };
        
        console.log('URL:', url);
        console.log('Body:', JSON.stringify(body, null, 2));
        console.log('\nSending request...\n');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        console.log('');
        
        const text = await response.text();
        console.log('Raw response:', text);
        console.log('');
        
        try {
            const data = JSON.parse(text);
            console.log('Parsed response:', JSON.stringify(data, null, 2));
            
            if (data.success) {
                console.log('\n✅ LOGIN SUCCESS!');
                console.log('Token received:', data.token ? 'Yes' : 'No');
                if (data.data && data.data.user) {
                    console.log('User role:', data.data.user.role);
                }
            } else {
                console.log('\n❌ LOGIN FAILED');
                console.log('Message:', data.message);
            }
        } catch (e) {
            console.log('Failed to parse JSON:', e.message);
        }
        
    } catch (error) {
        console.error('❌ Request error:', error.message);
        console.error(error);
    }
}

testLoginDirect();
