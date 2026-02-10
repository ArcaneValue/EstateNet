// Test the tenant ID validation logic
console.log('=== TESTING TENANT ID VALIDATION ===');

const testTenantIds = [
    'TN-ABC123',    // 9 chars - should NOT trigger lookup
    'TN-ABC1234',   // 10 chars - should NOT trigger lookup
    'TN-ABCD1234',  // 11 chars - should trigger lookup  
    'TN-ABC12345',  // 12 chars - should NOT trigger lookup (but maxLength prevents this)
    'ABC1234',      // 7 chars - should show format error
    'TN-ABC',       // 6 chars - should NOT trigger lookup
];

testTenantIds.forEach(id => {
    console.log(`\nTesting: "${id}" (length: ${id.length})`);

    // Format validation
    if (id.length >= 3 && !id.startsWith('TN-')) {
        console.log('❌ Format error: Must start with "TN-"');
    } else {
        console.log('✅ Format OK');
    }

    // Length validation  
    if (id.length === 11) {
        console.log('✅ Length OK - would trigger API lookup');
    } else if (id.length > 11) {
        console.log('❌ Too long - maxLength should prevent this');
    } else {
        console.log(`⏳ Too short (${id.length}/11) - waiting for more input`);
    }
});

console.log('\n=== REAL TENANT IDS FROM DATABASE ===');
const realTenantIds = ['TN-DVS9TCL8', 'TN-73SXBEDS', 'TN-TR2RI35V'];

realTenantIds.forEach(id => {
    console.log(`\nReal ID: "${id}" (length: ${id.length})`);
    if (id.length === 11 && id.startsWith('TN-')) {
        console.log('✅ Would trigger lookup successfully');
    } else {
        console.log('❌ Would fail validation');
    }
});
