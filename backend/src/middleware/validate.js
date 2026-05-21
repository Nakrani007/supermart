// Zod validation middleware factory.
// Usage: router.post('/route', validate(MySchema), controller)

export function validate(schema) {
  return (req, res, next) => {
    try {
      // Parse mutates req.body to the validated+coerced shape (e.g. strings → numbers)
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err); // ZodError flows to errorHandler which formats it properly
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}
