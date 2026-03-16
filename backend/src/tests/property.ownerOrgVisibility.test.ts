/**
 * Property Owner Org Visibility Tests
 * 
 * Policy: Owner can see/manage properties in their org (manager-created properties visible to owner)
 * 
 * Tests verify:
 * 1. Manager accepts invitation -> createdByOwnerId set
 * 2. Manager creates property -> ownerId = createdByOwnerId (org owner)
 * 3. Owner can see manager-created properties in their org
 * 4. Independent manager properties not visible to unrelated owners
 */

import request from 'supertest';
import { prisma } from '../utils/database';

const BASE_URL = 'http://localhost:3001';

describe('Property Owner Org Visibility', () => {
  let ownerToken: string;
  let ownerId: string;
  let managerToken: string;
  let managerId: string;
  let ownerPropertyId: string;
  let invitationId: string;

  beforeAll(async () => {
    // Login as owner
    const ownerLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'kazoora@gmail.com', password: 'Ak47grave' });
    
    ownerToken = ownerLogin.body.data.token;
    ownerId = ownerLogin.body.data.user.id;

    // Login as manager
    const managerLogin = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ email: 'mark@gmail.com', password: 'Ak47grave' });
    
    managerToken = managerLogin.body.data.token;
    managerId = managerLogin.body.data.user.id;
  });

  describe('Org Linkage Setup via Invitation', () => {
    it('should create owner property for invitation', async () => {
      const response = await request(BASE_URL)
        .post('/api/properties')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Owner Test Property for Org',
          location: 'Kampala, Uganda'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      ownerPropertyId = response.body.data.id;
    });

    it('should create invitation from owner to manager', async () => {
      const response = await request(BASE_URL)
        .post('/api/owner/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          propertyId: ownerPropertyId,
          managerEmail: 'mark@gmail.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      invitationId = response.body.data.id;
    });

    it('should accept invitation and set createdByOwnerId', async () => {
      const response = await request(BASE_URL)
        .post(`/api/owner/invitations/manager/${invitationId}/accept`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify createdByOwnerId was set
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { createdByOwnerId: true }
      });

      expect(manager?.createdByOwnerId).toBe(ownerId);
    });
  });

  describe('Manager Creates Property in Org', () => {
    let managerCreatedPropertyId: string;

    it('should create property with ownerId = org owner', async () => {
      const response = await request(BASE_URL)
        .post('/api/properties')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Manager Created Property in Org',
          location: 'Entebbe, Uganda'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      managerCreatedPropertyId = response.body.data.id;

      // Verify ownerId is the org owner, not the manager
      const property = await prisma.property.findUnique({
        where: { id: managerCreatedPropertyId },
        select: { ownerId: true, managerId: true }
      });

      expect(property?.ownerId).toBe(ownerId); // Org owner
      expect(property?.managerId).toBe(managerId); // Manager who created it
    });

    it('should be visible to org owner', async () => {
      const response = await request(BASE_URL)
        .get('/api/properties')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const properties = response.body.data;
      const foundProperty = properties.find((p: any) => p.id === managerCreatedPropertyId);

      expect(foundProperty).toBeDefined();
      expect(foundProperty.name).toBe('Manager Created Property in Org');
      expect(foundProperty.ownerId).toBe(ownerId);
      expect(foundProperty.managerId).toBe(managerId);
    });

    it('should be visible to manager who created it', async () => {
      const response = await request(BASE_URL)
        .get('/api/properties')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const properties = response.body.data;
      const foundProperty = properties.find((p: any) => p.id === managerCreatedPropertyId);

      expect(foundProperty).toBeDefined();
      expect(foundProperty.name).toBe('Manager Created Property in Org');
    });
  });

  describe('Independent Manager (No Org)', () => {
    let independentManagerToken: string;
    let independentManagerId: string;
    let independentPropertyId: string;

    beforeAll(async () => {
      // Register a new independent manager (not linked to any owner)
      const registerResponse = await request(BASE_URL)
        .post('/api/auth/register-manager')
        .send({
          email: 'independent.manager@test.com',
          password: 'TestPass123',
          name: 'Independent Manager',
          phoneNumber: '+256700000999'
        });

      expect(registerResponse.status).toBe(201);

      // Login as independent manager
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'independent.manager@test.com',
          password: 'TestPass123'
        });

      independentManagerToken = loginResponse.body.data.token;
      independentManagerId = loginResponse.body.data.user.id;
    });

    afterAll(async () => {
      // Clean up independent manager and property
      if (independentPropertyId) {
        await prisma.property.delete({ where: { id: independentPropertyId } }).catch(() => {});
      }
      await prisma.user.delete({ where: { id: independentManagerId } }).catch(() => {});
    });

    it('should create property with ownerId = self (no org)', async () => {
      const response = await request(BASE_URL)
        .post('/api/properties')
        .set('Authorization', `Bearer ${independentManagerToken}`)
        .send({
          name: 'Independent Manager Property',
          location: 'Jinja, Uganda'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      independentPropertyId = response.body.data.id;

      // Verify ownerId is the manager itself (no org linkage)
      const property = await prisma.property.findUnique({
        where: { id: independentPropertyId },
        select: { ownerId: true, managerId: true }
      });

      expect(property?.ownerId).toBe(independentManagerId);
      expect(property?.managerId).toBe(independentManagerId);
    });

    it('should NOT be visible to unrelated owner', async () => {
      const response = await request(BASE_URL)
        .get('/api/properties')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const properties = response.body.data;
      const foundProperty = properties.find((p: any) => p.id === independentPropertyId);

      expect(foundProperty).toBeUndefined();
    });

    it('should be visible to independent manager', async () => {
      const response = await request(BASE_URL)
        .get('/api/properties')
        .set('Authorization', `Bearer ${independentManagerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const properties = response.body.data;
      const foundProperty = properties.find((p: any) => p.id === independentPropertyId);

      expect(foundProperty).toBeDefined();
      expect(foundProperty.name).toBe('Independent Manager Property');
    });
  });

  describe('Multiple Managers in Same Org', () => {
    let secondManagerToken: string;
    let secondManagerId: string;
    let secondManagerPropertyId: string;
    let secondInvitationId: string;

    beforeAll(async () => {
      // Register second manager
      const registerResponse = await request(BASE_URL)
        .post('/api/auth/register-manager')
        .send({
          email: 'second.manager@test.com',
          password: 'TestPass123',
          name: 'Second Manager',
          phoneNumber: '+256700000888'
        });

      expect(registerResponse.status).toBe(201);

      // Login as second manager
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'second.manager@test.com',
          password: 'TestPass123'
        });

      secondManagerToken = loginResponse.body.data.token;
      secondManagerId = loginResponse.body.data.user.id;

      // Owner invites second manager
      const inviteResponse = await request(BASE_URL)
        .post('/api/owner/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          propertyId: ownerPropertyId,
          managerEmail: 'second.manager@test.com'
        });

      secondInvitationId = inviteResponse.body.data.id;

      // Second manager accepts
      await request(BASE_URL)
        .post(`/api/owner/invitations/manager/${secondInvitationId}/accept`)
        .set('Authorization', `Bearer ${secondManagerToken}`);
    });

    afterAll(async () => {
      // Clean up
      if (secondManagerPropertyId) {
        await prisma.property.delete({ where: { id: secondManagerPropertyId } }).catch(() => {});
      }
      await prisma.user.delete({ where: { id: secondManagerId } }).catch(() => {});
    });

    it('should link second manager to same org owner', async () => {
      const manager = await prisma.user.findUnique({
        where: { id: secondManagerId },
        select: { createdByOwnerId: true }
      });

      expect(manager?.createdByOwnerId).toBe(ownerId);
    });

    it('should create property owned by org owner', async () => {
      const response = await request(BASE_URL)
        .post('/api/properties')
        .set('Authorization', `Bearer ${secondManagerToken}`)
        .send({
          name: 'Second Manager Property in Org',
          location: 'Mbarara, Uganda'
        });

      expect(response.status).toBe(201);
      secondManagerPropertyId = response.body.data.id;

      const property = await prisma.property.findUnique({
        where: { id: secondManagerPropertyId },
        select: { ownerId: true, managerId: true }
      });

      expect(property?.ownerId).toBe(ownerId); // Same org owner
      expect(property?.managerId).toBe(secondManagerId);
    });

    it('should show both manager properties to org owner', async () => {
      const response = await request(BASE_URL)
        .get('/api/properties')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);

      const properties = response.body.data;
      const managerProperties = properties.filter((p: any) => 
        p.managerId === managerId || p.managerId === secondManagerId
      );

      expect(managerProperties.length).toBeGreaterThanOrEqual(2);
    });
  });
});
