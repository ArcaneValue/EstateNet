SELECT * FROM "units" WHERE "propertyId" IN (SELECT id FROM "properties" WHERE name LIKE 'Test Property%') ORDER BY "createdAt" DESC LIMIT 3;
