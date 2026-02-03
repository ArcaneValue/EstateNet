import { Request, Response } from 'express';
import { OwnerInvitationService } from '../services/ownerInvitationService';
import { AuthenticatedRequest } from '../middlewares/auth';
import { ApiResponse } from '../middlewares/errorHandler';

const ownerInvitationService = new OwnerInvitationService();

// Owner endpoints
export const createManagerInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { propertyId, managerEmail } = req.body;

        if (!propertyId || !managerEmail) {
            res.status(400).json({ success: false, message: 'Property ID and manager email are required' });
            return;
        }

        const invitation = await ownerInvitationService.createInvitation({
            propertyId,
            ownerId: req.user.id,
            managerEmail
        });

        const response: ApiResponse = {
            success: true,
            message: 'Invitation sent successfully',
            data: invitation
        };

        res.status(201).json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json(response);
        } else if (error instanceof Error && error.message.includes('already pending')) {
            res.status(409).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};

export const getOwnerInvitations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const invitations = await ownerInvitationService.getOwnerInvitations(req.user.id);

        const response: ApiResponse = {
            success: true,
            message: 'Invitations retrieved successfully',
            data: invitations
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };
        res.status(500).json(response);
    }
};

export const cancelInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        await ownerInvitationService.cancelInvitation(id, req.user.id);

        const response: ApiResponse = {
            success: true,
            message: 'Invitation cancelled'
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};

// Manager endpoints
export const getManagerInvitations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const invitations = await ownerInvitationService.getManagerInvitations(req.user.email);

        const response: ApiResponse = {
            success: true,
            message: 'Invitations retrieved successfully',
            data: invitations
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };
        res.status(500).json(response);
    }
};

export const acceptInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        await ownerInvitationService.acceptInvitation(id, req.user.id, req.user.email);

        const response: ApiResponse = {
            success: true,
            message: 'Invitation accepted'
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};

export const declineInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        await ownerInvitationService.declineInvitation(id, req.user.email);

        const response: ApiResponse = {
            success: true,
            message: 'Invitation declined'
        };

        res.json(response);
    } catch (error) {
        const response: ApiResponse = {
            success: false,
            message: error instanceof Error ? error.message : 'Internal server error'
        };

        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json(response);
        } else {
            res.status(500).json(response);
        }
    }
};
