import { prisma } from '../utils/database';

// Type assertions for the new models
type Property = any;
type Unit = any;

export interface CreatePropertyData {
  name: string;
  location: string;
  units?: {
    unitNumber: string;
    rentAmount: number;
  }[];
}

export interface CreateUnitData {
  propertyId: string;
  unitNumber: string;
  rentAmount: number;
}

export class PropertyService {
  async createProperty(data: CreatePropertyData): Promise<Property> {
    const { units, ...propertyData } = data;

    const property = await (prisma as any).property.create({
      data: {
        ...propertyData,
        units: units ? {
          create: units.map(unit => ({
            unitNumber: unit.unitNumber,
            rentAmount: unit.rentAmount
          }))
        } : undefined
      },
      include: {
        units: true
      }
    });

    return property;
  }

  async getPropertyById(id: string): Promise<Property | null> {
    return await (prisma as any).property.findUnique({
      where: { id },
      include: {
        units: true
      }
    });
  }

  async getAllProperties(): Promise<Property[]> {
    return await (prisma as any).property.findMany({
      include: {
        units: true
      }
    });
  }

  async createUnit(data: CreateUnitData): Promise<Unit> {
    return await (prisma as any).unit.create({
      data: {
        propertyId: data.propertyId,
        unitNumber: data.unitNumber,
        rentAmount: data.rentAmount
      }
    });
  }

  async getUnitById(id: string): Promise<Unit | null> {
    return await (prisma as any).unit.findUnique({
      where: { id },
      include: {
        property: true
      }
    });
  }

  async getUnitsByProperty(propertyId: string): Promise<Unit[]> {
    return await (prisma as any).unit.findMany({
      where: { propertyId },
      include: {
        property: true
      }
    });
  }
}
