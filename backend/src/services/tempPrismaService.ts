// Temporary PrismaClient wrapper until client is regenerated
class TempPrismaClient {
  async $queryRaw<T = any>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    // This is a simplified wrapper - in production, you'd use the actual Prisma client
    // For now, we'll throw an error to indicate this needs the real Prisma client
    throw new Error('Prisma client needs to be regenerated. Run: npm run db:generate');
  }
}

const prisma = new TempPrismaClient();
import { Property, Unit, Lease, TenantInvitation, LeaseStatus, InvitationStatus } from '../types/prisma';

// Temporary wrapper until Prisma client is regenerated
export class TempPrismaService {
  // Property operations
  async createProperty(data: {
    name: string;
    location: string;
    units?: {
      unitNumber: string;
      rentAmount: number;
    }[];
  }): Promise<Property> {
    // Use raw SQL for now until Prisma is regenerated
    const result = await prisma.$queryRaw`
      INSERT INTO "properties" (name, location, "createdAt", "updatedAt")
      VALUES (${data.name}, ${data.location}, NOW(), NOW())
      RETURNING id, name, location, "createdAt", "updatedAt"
    ` as Property[];

    const property = result[0];

    // Create units if provided
    if (data.units && data.units.length > 0) {
      for (const unit of data.units) {
        await prisma.$queryRaw`
          INSERT INTO "units" ("propertyId", "unitNumber", "rentAmount", "isOccupied", "createdAt", "updatedAt")
          VALUES (${property.id}, ${unit.unitNumber}, ${unit.rentAmount}, false, NOW(), NOW())
        `;
      }
    }

    return property;
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const result = await prisma.$queryRaw`
      SELECT id, name, location, "createdAt", "updatedAt"
      FROM "properties"
      WHERE id = ${id}
    ` as Property[];

    return result[0] || null;
  }

  async createUnit(data: {
    propertyId: string;
    unitNumber: string;
    rentAmount: number;
  }): Promise<Unit> {
    const result = await prisma.$queryRaw`
      INSERT INTO "units" ("propertyId", "unitNumber", "rentAmount", "isOccupied", "createdAt", "updatedAt")
      VALUES (${data.propertyId}, ${data.unitNumber}, ${data.rentAmount}, false, NOW(), NOW())
      RETURNING id, "propertyId", "unitNumber", "rentAmount", "isOccupied", "createdAt", "updatedAt"
    ` as Unit[];

    return result[0];
  }

  // Tenant invitation operations
  async createInvitation(data: {
    tenantId: string;
    propertyId: string;
    unitId: string;
    rentAmount: number;
    invitedByUserId: string;
  }): Promise<TenantInvitation> {
    const result = await prisma.$queryRaw`
      INSERT INTO "tenant_invitations" ("tenantId", "propertyId", "unitId", "rentAmount", "status", "invitedByUserId", "createdAt")
      VALUES (${data.tenantId}, ${data.propertyId}, ${data.unitId}, ${data.rentAmount}, 'PENDING', ${data.invitedByUserId}, NOW())
      RETURNING id, "tenantId", "propertyId", "unitId", "rentAmount", status, "invitedByUserId", "createdAt", "respondedAt"
    ` as TenantInvitation[];

    return result[0];
  }

  async getInvitationById(id: string): Promise<TenantInvitation | null> {
    const result = await prisma.$queryRaw`
      SELECT ti.*, p.name as "propertyName", p.location as "propertyLocation", u."unitNumber"
      FROM "tenant_invitations" ti
      LEFT JOIN "properties" p ON ti."propertyId" = p.id
      LEFT JOIN "units" u ON ti."unitId" = u.id
      WHERE ti.id = ${id}
    ` as any[];

    if (result[0]) {
      return {
        id: result[0].id,
        tenantId: result[0].tenantId,
        propertyId: result[0].propertyId,
        unitId: result[0].unitId,
        rentAmount: result[0].rentAmount,
        status: result[0].status as InvitationStatus,
        invitedByUserId: result[0].invitedByUserId,
        createdAt: result[0].createdAt,
        respondedAt: result[0].respondedAt,
        property: {
          name: result[0].propertyName,
          location: result[0].propertyLocation
        },
        unit: {
          unitNumber: result[0].unitNumber
        }
      };
    }

    return null;
  }

  async acceptInvitation(invitationId: string): Promise<Lease> {
    // Get invitation first
    const invitation = await this.getInvitationById(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Create lease
    const leaseResult = await prisma.$queryRaw`
      INSERT INTO "leases" ("tenantId", "propertyId", "unitId", "rentAmount", "status", "startDate", "createdAt", "updatedAt")
      VALUES (${invitation.tenantId}, ${invitation.propertyId}, ${invitation.unitId}, ${invitation.rentAmount}, 'ACTIVE', NOW(), NOW(), NOW())
      RETURNING id, "tenantId", "propertyId", "unitId", "rentAmount", "status", "startDate", "endDate", "createdAt", "updatedAt"
    ` as Lease[];

    // Update unit status
    await prisma.$queryRaw`
      UPDATE "units"
      SET "isOccupied" = true, "updatedAt" = NOW()
      WHERE id = ${invitation.unitId}
    `;

    // Update invitation status
    await prisma.$queryRaw`
      UPDATE "tenant_invitations"
      SET status = 'ACCEPTED', "respondedAt" = NOW()
      WHERE id = ${invitationId}
    `;

    return leaseResult[0];
  }

  async declineInvitation(invitationId: string): Promise<TenantInvitation> {
    const result = await prisma.$queryRaw`
      UPDATE "tenant_invitations"
      SET status = 'DECLINED', "respondedAt" = NOW()
      WHERE id = ${invitationId}
      RETURNING id, "tenantId", "propertyId", "unitId", "rentAmount", status, "invitedByUserId", "createdAt", "respondedAt"
    ` as TenantInvitation[];

    return result[0];
  }

  async getActiveLeaseByTenant(tenantId: string): Promise<Lease | null> {
    const result = await prisma.$queryRaw`
      SELECT l.*, p.name as "propertyName", p.location as "propertyLocation", u."unitNumber"
      FROM "leases" l
      LEFT JOIN "properties" p ON l."propertyId" = p.id
      LEFT JOIN "units" u ON l."unitId" = u.id
      WHERE l."tenantId" = ${tenantId} AND l.status = 'ACTIVE'
    ` as any[];

    if (result[0]) {
      return {
        id: result[0].id,
        tenantId: result[0].tenantId,
        propertyId: result[0].propertyId,
        unitId: result[0].unitId,
        rentAmount: result[0].rentAmount,
        status: result[0].status as LeaseStatus,
        startDate: result[0].startDate,
        endDate: result[0].endDate,
        createdAt: result[0].createdAt,
        updatedAt: result[0].updatedAt,
        property: {
          name: result[0].propertyName,
          location: result[0].propertyLocation
        },
        unit: {
          unitNumber: result[0].unitNumber
        }
      };
    }

    return null;
  }

  async endLease(leaseId: string, reason: LeaseStatus = LeaseStatus.ENDED): Promise<Lease> {
    // Get lease first
    const leaseResult = await prisma.$queryRaw`
      SELECT * FROM "leases" WHERE id = ${leaseId}
    ` as any[];

    if (!leaseResult[0]) {
      throw new Error('Lease not found');
    }

    const lease = leaseResult[0];

    // Update lease
    const updatedResult = await prisma.$queryRaw`
      UPDATE "leases"
      SET status = ${reason}, "endDate" = NOW(), "updatedAt" = NOW()
      WHERE id = ${leaseId}
      RETURNING id, "tenantId", "propertyId", "unitId", "rentAmount", "status", "startDate", "endDate", "createdAt", "updatedAt"
    ` as Lease[];

    // If this was the active lease, update unit status
    if (lease.status === 'ACTIVE') {
      await prisma.$queryRaw`
        UPDATE "units"
        SET "isOccupied" = false, "updatedAt" = NOW()
        WHERE id = ${lease.unitId}
      `;
    }

    return updatedResult[0];
  }
}
