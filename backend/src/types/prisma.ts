// Temporary types until Prisma client is regenerated
export enum UserRole {
  MANAGER = 'MANAGER',
  TENANT = 'TENANT'
}

export enum LeaseStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  EVICTED = 'EVICTED'
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

export interface Property {
  id: string;
  name: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
  units?: Unit[];
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  rentAmount: number;
  isOccupied: boolean;
  createdAt: Date;
  updatedAt: Date;
  property?: Property;
}

export interface Lease {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  rentAmount: number;
  startDate: Date;
  endDate?: Date;
  status: LeaseStatus;
  createdAt: Date;
  updatedAt: Date;
  tenantIdentity?: {
    name: string;
    email: string;
  };
  property?: {
    name: string;
    location: string;
  };
  unit?: {
    unitNumber: string;
  };
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  rentAmount: number;
  status: InvitationStatus;
  invitedByUserId: string;
  createdAt: Date;
  respondedAt?: Date;
  tenantIdentity?: {
    name: string;
    email: string;
  };
  property?: {
    name: string;
    location: string;
  };
  unit?: {
    unitNumber: string;
  };
}
