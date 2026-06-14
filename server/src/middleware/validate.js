export const validate = (schema, source = 'body') => (req, res, next) => {
    try {
        const parsed = schema.parse(req[source]);
        // Replace source data with the validated/parsed data (casts types, strips unrecognized keys)
        req[source] = parsed;
        next();
    } catch (error) {
        // Forward the ZodError directly to the errorHandler middleware
        next(error);
    }
};
