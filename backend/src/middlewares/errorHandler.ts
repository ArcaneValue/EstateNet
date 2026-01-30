import { Request, Response, NextFunction } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error('Error:', error);

    // Default error response
    const response: ApiResponse = {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };

    // Handle specific error types
    if (error.name === 'ValidationError') {
        response.message = 'Validation failed';
        res.status(400);
    } else if (error.name === 'UnauthorizedError') {
        response.message = 'Unauthorized';
        res.status(401);
    } else if (error.name === 'ForbiddenError') {
        response.message = 'Forbidden';
        res.status(403);
    } else if (error.name === 'NotFoundError') {
        response.message = 'Resource not found';
        res.status(404);
    } else {
        res.status(500);
    }

    res.json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    });
};
