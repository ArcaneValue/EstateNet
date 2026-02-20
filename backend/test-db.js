const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

app.get('/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('DB test result:', result);
    res.json({ success: true, result });
  } catch (error) {
    console.error('DB test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/test-tenant', async (req, res) => {
  try {
    console.log('Testing tenant lookup...');
    const tenant = await prisma.tenantIdentity.findFirst();
    console.log('Tenant result:', tenant);
    res.json({ success: true, tenant });
  } catch (error) {
    console.error('Tenant test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
