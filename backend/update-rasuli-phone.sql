-- Update Rasuli's phone number to +256704616280
UPDATE users 
SET 
  "phoneNumber" = '+256704616280',
  "payoutPhoneNumber" = '+256704616280'
WHERE email = 'rasuli@gmail.com';

-- Verify the update
SELECT 
  email, 
  "phoneNumber", 
  "payoutPhoneNumber",
  role
FROM users 
WHERE email = 'rasuli@gmail.com';
