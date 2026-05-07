import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import { ImageUploadService } from '../services/imageUploadService';
import { prisma } from '../utils/database';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Response } from 'express';

const router = express.Router();
const imageService = new ImageUploadService();

// Upload property image (single main photo)
router.post('/property/:propertyId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const { base64Image } = req.body;
    
    if (!base64Image) {
      res.status(400).json({ success: false, message: 'Image data required' });
      return;
    }
    
    // Verify property exists and user has permission
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true, managerId: true }
    });

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    // Check if user is owner or manager
    const userId = req.user?.id;
    if (userId !== property.ownerId && userId !== property.managerId) {
      res.status(403).json({ success: false, message: 'Not authorized to upload image for this property' });
      return;
    }
    
    const imageUrl = await imageService.uploadPropertyImage(
      base64Image,
      propertyId
    );
    
    // Update property in database
    await prisma.property.update({
      where: { id: propertyId },
      data: { imageUrl }
    });
    
    res.json({ success: true, data: { imageUrl } });
  } catch (error: any) {
    console.error('Property image upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload image' });
  }
});

// Upload unit image (Phase 2 - not implemented in UI yet)
router.post('/unit/:unitId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { unitId } = req.params;
    const { base64Image } = req.body;
    
    if (!base64Image) {
      res.status(400).json({ success: false, message: 'Image data required' });
      return;
    }

    // Verify unit exists and user has permission
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        property: {
          select: { ownerId: true, managerId: true }
        }
      }
    });

    if (!unit) {
      res.status(404).json({ success: false, message: 'Unit not found' });
      return;
    }

    // Check if user is owner or manager
    const userId = req.user?.id;
    if (userId !== unit.property.ownerId && userId !== unit.property.managerId) {
      res.status(403).json({ success: false, message: 'Not authorized to upload image for this unit' });
      return;
    }
    
    const imageUrl = await imageService.uploadUnitImage(base64Image, unitId);
    
    await prisma.unit.update({
      where: { id: unitId },
      data: { imageUrl }
    });
    
    res.json({ success: true, data: { imageUrl } });
  } catch (error: any) {
    console.error('Unit image upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload image' });
  }
});

export default router;
