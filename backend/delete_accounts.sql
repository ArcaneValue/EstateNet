-- Delete George and Annabel accounts from localhost database
-- First check what we're deleting
SELECT id, email, name, role FROM "User" WHERE LOWER(email) IN ('george@gmail.com', 'annabel@gmail.com');

-- Delete the accounts
DELETE FROM "User" WHERE LOWER(email) IN ('george@gmail.com', 'annabel@gmail.com');
