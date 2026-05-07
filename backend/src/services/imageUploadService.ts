import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

export class ImageUploadService {
  async uploadPropertyImage(
    base64Image: string,
    propertyId: string
  ): Promise<string> {
    const folder = `estatenet/properties/${propertyId}`;
    const publicId = `property_${Date.now()}`;
    
    const result: UploadApiResponse = await cloudinary.uploader.upload(
      base64Image,
      {
        folder,
        public_id: publicId,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' }, // Max dimensions
          { quality: 'auto' }, // Automatic quality optimization
          { fetch_format: 'auto' } // Automatic format (WebP, etc.)
        ]
      }
    );
    
    return result.secure_url;
  }

  // Phase 2: Unit image upload (not implemented in UI yet)
  async uploadUnitImage(
    base64Image: string,
    unitId: string
  ): Promise<string> {
    const folder = `estatenet/units/${unitId}`;
    const publicId = `unit_${Date.now()}`;
    
    const result = await cloudinary.uploader.upload(
      base64Image,
      {
        folder,
        public_id: publicId,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      }
    );
    
    return result.secure_url;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    // Extract public_id from Cloudinary URL
    const publicId = this.extractPublicId(imageUrl);
    await cloudinary.uploader.destroy(publicId);
  }

  private extractPublicId(url: string): string {
    // Extract public_id from Cloudinary URL
    // Example: https://res.cloudinary.com/cloud/image/upload/v123/folder/image.jpg
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
      // Get everything after 'upload/v123/'
      const pathParts = parts.slice(uploadIndex + 2);
      const fullPath = pathParts.join('/');
      // Remove file extension
      return fullPath.replace(/\.[^/.]+$/, '');
    }
    // Fallback: just get filename without extension
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }
}
