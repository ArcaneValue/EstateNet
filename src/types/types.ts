// Core Type Definitions for EstateNet

export type UserRole = 'OWNER' | 'MANAGER' | 'TENANT';

export type PropertyType = 'apartment' | 'house' | 'commercial';

export type OwnershipType = 'company' | 'personal';

export type MaintenanceCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type PaymentMethod = 'estatenet' | 'cash' | 'bank_transfer';

export type RentStatus = 'current' | 'overdue' | 'past_overdue';

export type ActivityType = 'payment' | 'tenant_request' | 'maintenance' | 'reminder_sent' | 'tenant_invited' | 'tenant_added' | 'vacancy';

export type ManagerRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

// User Interface
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'OWNER' | 'MANAGER' | 'TENANT';
    tenantId?: string;
    phoneNumber?: string;
    profileImage?: string;
}

// Property Unit Interface
export interface Unit {
    id: string;
    unitNumber: string;
    squareFootage: number;
    rentAmount: number;
    isOccupied: boolean;
    imageUrl?: string; // Unit image URL
    tenantId?: string;
    leases?: any[]; // Lease relation from database
}

// Property Interface
export interface Property {
    id: string;
    name: string;
    location: string;
    propertyType: PropertyType;
    units: Unit[];
    imageUrl?: string; // Property main image

    // Financial
    ownership: OwnershipType;
    propertyOwner: string;
    decisionAuthority: string;
    existingArrears: number;
    creditors: string;
    monthlyExpenses: number;
    expenseApprovalLimit: number;

    // Operations
    rentCollectionMethod: string;
    paymentTerms: string;
    latePaymentPolicy: string;
    securityDeposit: number;

    // Maintenance & Compliance
    maintenanceCondition: MaintenanceCondition;
    lastPreventiveMaintenance?: Date;
    fireSafetySystems: boolean;
    legalCompliance: string;
    requiredRepairs: string;

    // Responsibilities
    maintenanceHandler: string;
    communicationHandler: string;
    expenseApprover: string;
    emergencyContacts: string;

    createdAt: Date;
    updatedAt: Date;
}

// Tenant Interface
export interface Tenant {
    id: string;
    tenantId: string; // Unique 6-character ID
    name: string;
    email: string;
    phoneNumber: string;
    profileImage?: string;

    // Assignment
    propertyId?: string;
    unitId?: string;

    // Payment Info
    rentAmount: number;
    paymentStatus: RentStatus;
    lastPaymentDate?: Date;
    daysOverdue: number;
    amountOwed: number;

    createdAt: Date;
}

// Payment Interface
export interface Payment {
    id: string;
    tenantId: string;
    propertyId: string;
    unitId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;  // Changed to string for ISO date strings
    receiptUrl?: string;
    notes?: string;
}

// Activity Interface
export interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
    iconColor: string;
    iconBg: string;
    relatedId?: string; // ID of related entity (tenant, property, etc.)
    amount?: number; // Optional for payment activities
    propertyName?: string; // Optional property reference
    tenantName?: string; // Optional tenant reference
}

// Financial Statement Interfaces
export interface IncomeStatement {
    totalRentalIncome: number;
    otherIncome: number;
    operatingExpenses: {
        maintenance: number;
        utilities: number;
        management: number;
        insurance: number;
        other: number;
    };
    netOperatingIncome: number;
    period: {
        startDate: Date;
        endDate: Date;
    };
}

export interface BalanceSheet {
    assets: {
        propertyValues: number;
        cash: number;
        accountsReceivable: number;
        other: number;
    };
    liabilities: {
        mortgages: number;
        accountsPayable: number;
        securityDeposits: number;
        other: number;
    };
    equity: number;
    asOfDate: Date;
}

export interface CashflowStatement {
    operatingActivities: {
        rentCollected: number;
        expensesPaid: number;
        net: number;
    };
    investingActivities: {
        propertyPurchases: number;
        propertyImprovements: number;
        net: number;
    };
    financingActivities: {
        loanProceeds: number;
        loanPayments: number;
        net: number;
    };
    netCashChange: number;
    period: {
        startDate: Date;
        endDate: Date;
    };
}

// Add Property Form Data
export interface AddPropertyFormData {
    // Step 1: Basic Information
    name: string;
    location: string;
    propertyType: PropertyType;
    numberOfUnits: number;
    squareFootagePerUnit: number;

    // Step 2: Financial Details
    ownership: OwnershipType;
    propertyOwner: string;
    decisionAuthority: string;
    currentOccupancyRate: number;
    rentalRates: { [unitType: string]: number };
    existingArrears: number;
    creditors: string;
    monthlyExpenses: number;

    // Step 3: Operations
    expenseApprovalLimit: number;
    rentCollectionMethod: string;
    paymentTerms: string;
    latePaymentPolicy: string;
    securityDeposit: number;

    // Step 4: Maintenance & Compliance
    maintenanceCondition: MaintenanceCondition;
    lastPreventiveMaintenance?: Date;
    fireSafetySystems: boolean;
    legalCompliance: string;
    requiredRepairs: string;
    maintenanceSchedule: string;

    // Step 5: Responsibilities
    maintenanceHandler: string;
    communicationHandler: string;
    expenseApprover: string;
    emergencyContacts: string;
    serviceProviders: string;
}

// Property Manager Interface
export interface PropertyManager {
    id: string;
    propertyId: string;
    userId: string;
    name: string;
    email: string;
    phoneNumber?: string;
    role: ManagerRole;
    permissions: {
        canViewTenants: boolean;
        canManageTenants: boolean;
        canViewPayments: boolean;
        canManagePayments: boolean;
        canViewReports: boolean;
        canManageProperty: boolean;
        canInviteManagers: boolean;
    };
    invitedBy: string;
    invitedAt: Date;
    respondedAt?: Date;
    status: 'pending' | 'active' | 'inactive';
}

// Access Request Interface
export interface AccessRequest {
    id: string;
    propertyId: string;
    propertyName: string;
    requesterId: string;
    requesterName: string;
    requesterEmail: string;
    requestedRole: ManagerRole;
    propertyCode?: string;
    message?: string;
    status: AccessRequestStatus;
    createdAt: Date;
    respondedAt?: Date;
    respondedBy?: string;
}
