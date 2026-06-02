import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../utils/database';
import { LEGAL_DOCUMENTS, LegalDocumentType } from '../config/legal';
import emailService from '../services/emailService';

// GET /legal/status
export const getLegalStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let acceptances: Record<string, string> = {};

    if (req.user?.id) {
      const user = await (prisma as any).user.findUnique({
        where: { id: req.user.id },
        select: { legalAcceptances: true },
      });
      acceptances = (user as any)?.legalAcceptances || {};
    }

    const documents = LEGAL_DOCUMENTS.map((doc) => ({
      type: doc.type,
      version: doc.version,
      effectiveDate: doc.effectiveDate,
      url: doc.url,
      acceptedVersion: acceptances[doc.type] || null,
      requiresAcceptance: acceptances[doc.type] !== doc.version,
    }));

    res.json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    console.error('Get legal status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// POST /legal/accept
export const acceptLegalDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { documentType, version } = req.body;

    if (!documentType || !version) {
      res.status(400).json({ success: false, message: 'documentType and version are required' });
      return;
    }

    const validTypes: LegalDocumentType[] = ['privacyPolicy', 'termsOfService'];
    if (!validTypes.includes(documentType)) {
      res.status(400).json({ success: false, message: 'Invalid documentType. Must be privacyPolicy or termsOfService' });
      return;
    }

    const doc = LEGAL_DOCUMENTS.find((d) => d.type === documentType);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    if (version !== doc.version) {
      res.status(400).json({ success: false, message: `Invalid version. Current version is ${doc.version}` });
      return;
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: req.user.id },
      select: { legalAcceptances: true },
    });

    const currentAcceptances = (user as any)?.legalAcceptances || {};
    currentAcceptances[documentType] = version;

    await (prisma as any).user.update({
      where: { id: req.user.id },
      data: { legalAcceptances: currentAcceptances },
    });

    res.json({
      success: true,
      message: `${documentType === 'privacyPolicy' ? 'Privacy Policy' : 'Terms of Service'} version ${version} accepted`,
    });
  } catch (error) {
    console.error('Accept legal document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// POST /legal/notify-update (admin-only: notify all users of a legal update)
export const notifyLegalUpdate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const { documentType } = req.body;
    const validTypes: LegalDocumentType[] = ['privacyPolicy', 'termsOfService'];
    if (!validTypes.includes(documentType)) {
      res.status(400).json({ success: false, message: 'Invalid documentType' });
      return;
    }

    const doc = LEGAL_DOCUMENTS.find((d) => d.type === documentType);
    if (!doc) {
      res.status(404).json({ success: false, message: 'Document config not found' });
      return;
    }

    // Fetch all users with email
    const users = await (prisma as any).user.findMany({
      select: { email: true, name: true },
    });

    const validUsers = users.filter((u: any) => u.email);

    // Send asynchronously — fire-and-forget
    const results = await Promise.allSettled(
      validUsers.map((u: any) =>
        emailService.sendPolicyUpdateEmail(u.email, u.name, documentType, doc.version, doc.effectiveDate)
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[LegalNotify] Sent ${succeeded}/${validUsers.length} emails (${failed} failed)`);

    res.json({
      success: true,
      message: `Notification sent to ${succeeded} users${failed > 0 ? ` (${failed} failed)` : ''}`,
      data: { total: validUsers.length, succeeded, failed },
    });
  } catch (error) {
    console.error('Notify legal update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
