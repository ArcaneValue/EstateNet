// Test if email normalization is causing issues
const validator = require('express-validator');

const testEmail = 'admin.estatenet@gmail.com';

console.log('Original email:', testEmail);
console.log('Lowercase:', testEmail.toLowerCase());

// The normalizeEmail() function might be doing something unexpected
// Let's see what it does
const { body } = validator;

const emailValidation = body('email')
    .trim()
    .isEmail()
    .normalizeEmail();

console.log('\nEmail validation chain created');
console.log('This might be converting the email in unexpected ways');
console.log('\nTry logging in with the email EXACTLY as stored in database:');
console.log('  admin.estatenet@gmail.com');
