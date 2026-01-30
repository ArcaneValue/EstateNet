import jwt from 'jsonwebtoken';

export interface JWTPayload {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
}

export const generateToken = (user: JWTPayload): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }

    return jwt.sign(user, secret, {
        expiresIn: '7d'
    });
};

export const verifyToken = (token: string): JWTPayload => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }

    return jwt.verify(token, secret) as JWTPayload;
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
};
