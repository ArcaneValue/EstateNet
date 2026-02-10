console.log('=== DEBUGGING SEND INVITATION BUTTON ===');

// Simulate the button disabled conditions
const debugButtonState = (tenantIdInput, selectedPropertyId, selectedUnitId, rentAmount, isLoading, tenantData) => {
    console.log('\nButton State Check:');
    console.log(`tenantIdInput: "${tenantIdInput}" (${tenantIdInput ? '✅' : '❌'})`);
    console.log(`selectedPropertyId: "${selectedPropertyId}" (${selectedPropertyId ? '✅' : '❌'})`);
    console.log(`selectedUnitId: "${selectedUnitId}" (${selectedUnitId ? '✅' : '❌'})`);
    console.log(`rentAmount: "${rentAmount}" (${rentAmount ? '✅' : '❌'})`);
    console.log(`isLoading: ${isLoading} (${!isLoading ? '✅' : '❌'})`);
    console.log(`tenantData: ${tenantData ? '✅' : '❌'}`);
    
    const disabled = !tenantIdInput || !selectedPropertyId || !selectedUnitId || !rentAmount || isLoading || !tenantData;
    console.log(`\n🔘 Button DISABLED: ${disabled}`);
    
    if (disabled) {
        console.log('❌ BUTTON IS DISABLED - Missing:');
        if (!tenantIdInput) console.log('  - Tenant ID');
        if (!selectedPropertyId) console.log('  - Property');
        if (!selectedUnitId) console.log('  - Unit');
        if (!rentAmount) console.log('  - Rent Amount');
        if (isLoading) console.log('  - Currently loading');
        if (!tenantData) console.log('  - Tenant data (lookup failed)');
    } else {
        console.log('✅ BUTTON SHOULD BE ENABLED');
    }
};

// Test scenarios
console.log('=== SCENARIO 1: All fields filled but tenant lookup failed ===');
debugButtonState('TN-DVS9TCL8', 'prop123', 'unit456', '1500', false, null);

console.log('\n=== SCENARIO 2: All fields filled with tenant lookup success ===');
debugButtonState('TN-DVS9TCL8', 'prop123', 'unit456', '1500', false, { name: 'Test Tenant', email: 'test@test.com' });

console.log('\n=== SCENARIO 3: Missing fields ===');
debugButtonState('TN-DVS9TCL8', '', 'unit456', '1500', false, { name: 'Test Tenant', email: 'test@test.com' });

console.log('\n=== MOST LIKELY ISSUE ===');
console.log('The button is probably disabled because tenantData is null/undefined.');
console.log('This happens when the tenant ID lookup fails or doesn\'t complete properly.');
console.log('\nCHECKLIST:');
console.log('1. Is the tenant ID exactly 11 characters?');
console.log('2. Does the tenant lookup show a green checkmark?');
console.log('3. Are all other fields filled (property, unit, rent)?');
