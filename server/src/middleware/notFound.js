export const notFound = (req, res, next) => {
    const error = new Error(`Route Not Found - ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    error.isOperational = true;
    next(error);
};
