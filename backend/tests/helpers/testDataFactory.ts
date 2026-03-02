import { prisma } from '../../src/utils/database';
import bcrypt from 'bcryptjs';

/**
 * Test data factory for creating deterministic test entities
 * with proper foreign key relationships
 */

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

export function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

export async function createTenantIdentity(overrides?: {
  tenantId?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
}) {
  const tenantId = overrides?.tenantId || uniqueId('tenant');
  const email = overrides?.email || uniqueEmail('tenant');
  
  const tenantIdentity = await prisma.tenantIdentity.create({
    data: {
      tenantId,
      name: overrides?.name || 'Test Tenant',
      email,
      phoneNumber: overrides?.phoneNumber || '+256700000000',
      ...overrides
    }
  });
  
  return tenantIdentity;
}

export async function createUserForTenant(
  role: 'OWNER' | 'MANAGER' | 'TENANT',
  tenantId: string,
  overrides?: {
    name?: string;
    email?: string;
    passwordHash?: string;
    [key: string]: any;
  }
) {
  const email = overrides?.email || uniqueEmail(role.toLowerCase());
  const passwordHash = overrides?.passwordHash || await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.create({
    data: {
      name: overrides?.name || `Test ${role}`,
      email,
      passwordHash,
      role,
      tenantId: role === 'TENANT' ? tenantId : null, // Only TENANT users reference TenantIdentity
      ...overrides
    }
  });
  
  return user;
}

export async function createLeaseForTenant(
  tenantId: string,
  propertyId: string,
  unitId: string,
  overrides?: {
    rentAmount?: number;
    startDate?: Date;
    endDate?: Date;
    status?: 'ACTIVE' | 'ENDED';
  }
) {
  const lease = await prisma.lease.create({
    data: {
      tenantId, // This must be TenantIdentity.tenantId
      propertyId,
      unitId,
      rentAmount: overrides?.rentAmount || 500000,
      startDate: overrides?.startDate || new Date(),
      endDate: overrides?.endDate,
      status: overrides?.status || 'ACTIVE',
      ...overrides
    }
  });
  
  return lease;
}

export async function createPaymentClaim(
  tenantId: string, // TenantIdentity.tenantId
  leaseId: string,
  managerId: string,
  overrides?: {
    amount?: number;
    method?: 'CASH' | 'MTN' | 'AIRTEL' | 'BANK_TRANSFER';
    referenceText?: string;
    claimedPaidAt?: Date;
  }
) {
  const paymentClaim = await prisma.paymentClaim.create({
    data: {
      tenantId, // Must reference TenantIdentity.tenantId
      leaseId,
      managerId,
      amount: overrides?.amount || 300000,
      currency: 'UGX',
      claimedPaidAt: overrides?.claimedPaidAt || new Date(),
      method: overrides?.method || 'CASH',
      referenceText: overrides?.referenceText,
      status: 'PENDING',
      flagged: false,
      ...overrides
    }
  });
  
  return paymentClaim;
}

export async function createPropertyWithUnit(
  ownerId: string,
  managerId: string,
  overrides?: {
    propertyName?: string;
    location?: string;
    unitNumber?: string;
    rentAmount?: number;
  }
) {
  const property = await prisma.property.create({
    data: {
      name: overrides?.propertyName || 'Test Property',
      location: overrides?.location || 'Test Location',
      ownerId,
      managerId
    }
  });
  
  const unit = await prisma.unit.create({
    data: {
      unitNumber: overrides?.unitNumber || 'TEST-101',
      propertyId: property.id,
      rentAmount: overrides?.rentAmount || 500000
    }
  });
  
  return { property, unit };
}

/**
 * Cleanup helper that deletes in correct order to respect FK constraints
 */
export async function cleanupTestData(
  userIds?: string[],
  tenantIds?: string[],
  propertyIds?: string[],
  leaseIds?: string[],
  claimIds?: string[]
) {
  try {
    // Delete in reverse dependency order
    if (claimIds?.length) {
      await prisma.paymentClaim.deleteMany({
        where: { id: { in: claimIds } }
      });
    }
    
    if (tenantIds?.length) {
      // Delete claims by tenantId
      await prisma.paymentClaim.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });
      
      // Delete leases by tenantId
      await prisma.lease.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });
      
      // Delete tenant identities
      await prisma.tenantIdentity.deleteMany({
        where: { tenantId: { in: tenantIds } }
      });
    }
    
    if (leaseIds?.length) {
      await prisma.lease.deleteMany({
        where: { id: { in: leaseIds } }
      });
    }
    
    if (propertyIds?.length) {
      // Delete units first
      await prisma.unit.deleteMany({
        where: { propertyId: { in: propertyIds } }
      });
      
      // Then properties
      await prisma.property.deleteMany({
        where: { id: { in: propertyIds } }
      });
    }
    
    if (userIds?.length) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}
