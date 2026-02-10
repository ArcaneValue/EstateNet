console.log('=== SEND INVITATION BUTTON DEBUG GUIDE ===');

console.log('\n🔍 STEP 1: CHECK CONSOLE LOGS');
console.log('Open the app and try the tenant lookup. Look for:');
console.log('• "🔍 Looking up tenant ID: XXX" - confirms lookup is triggered');
console.log('• "📡 API Response: {...}" - shows backend response');
console.log('• "✅ Tenant found, setting tenantData" - confirms success');
console.log('• "❌ Tenant lookup failed" - shows what went wrong');

console.log('\n🔍 STEP 2: CHECK BUTTON CLICK');
console.log('Try clicking the "Send Invitation" button and look for:');
console.log('• "🔘 Button clicked!" - confirms button receives click');
console.log('• "🔘 Button disabled state: false" - confirms button is enabled');
console.log('• "🎯 handleInvite called" - confirms function is called');

console.log('\n🔍 STEP 3: COMMON ISSUES & FIXES');

console.log('\n❌ ISSUE: Tenant lookup fails');
console.log('Symptoms: No green checkmark, "Tenant ID not found" error');
console.log('Causes: Backend down, wrong tenant ID, API endpoint missing');
console.log('Fix: Check backend is running, verify tenant ID is 11 chars');

console.log('\n❌ ISSUE: Button disabled');
console.log('Symptoms: Button appears but can\'t click, no "Button clicked!" log');
console.log('Causes: Missing property/unit/rent, tenantData is null');
console.log('Fix: Fill all fields, ensure tenant lookup shows green checkmark');

console.log('\n❌ ISSUE: Button clicks but nothing happens');
console.log('Symptoms: "Button clicked!" appears but no "handleInvite called"');
console.log('Causes: JavaScript error, function not defined');
console.log('Fix: Check console for errors, restart app');

console.log('\n🎯 QUICK TEST:');
console.log('1. Use existing tenant: TN-DVS9TCL8');
console.log('2. Fill all fields: property, unit, rent amount');
console.log('3. Look for green checkmark with tenant name');
console.log('4. Check console logs for any errors');

console.log('\n✅ EXPECTED FLOW:');
console.log('1. Enter 11-char tenant ID → API lookup → Green checkmark');
console.log('2. Select property → Select unit → Enter rent');
console.log('3. Button becomes enabled → Click → Invitation sent');

console.log('\n📱 If still not working, check:');
console.log('• Backend is running (http://localhost:3001)');
console.log('• Manager is logged in with valid token');
console.log('• Network connectivity to backend');
console.log('• Console errors in React Native debugger');
