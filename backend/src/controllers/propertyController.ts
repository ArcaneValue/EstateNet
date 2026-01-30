import { Response } from 'express';
import { PropertyService, CreatePropertyData } from '../services/propertyService';
import { AuthenticatedRequest } from '../middlewares/auth';

const propertyService = new PropertyService();

export const createProperty = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, location, units }: CreatePropertyData = req.body;

    // Validation
    if (!name || !location) {
      res.status(400).json({
        success: false,
        message: 'Name and location are required'
      });
      return;
    }

    if (units) {
      for (const unit of units) {
        if (!unit.unitNumber || !unit.rentAmount) {
          res.status(400).json({
            success: false,
            message: 'Each unit must have unitNumber and rentAmount'
          });
          return;
        }
      }
    }

    const property = await propertyService.createProperty({ name, location, units });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getAllProperties = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const properties = await propertyService.getAllProperties();

    res.status(200).json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getPropertyById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
      return;
    }

    const property = await propertyService.getPropertyById(id);

    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/*
Postman examples:

POST /api/properties
{
  "name": "Sunrise Apartments",
  "location": "Kampala, Nakasero",
  "units": [
    {
      "unitNumber": "101",
      "rentAmount": 1200000
    },
    {
      "unitNumber": "102",
      "rentAmount": 1400000
    }
  ]
}

GET /api/properties/property-id-here
*/
