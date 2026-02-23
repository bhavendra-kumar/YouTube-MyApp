export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers,
      });

      req.validated = parsed;
      return next();
    } catch (err) {
      const message =
        err?.issues?.length > 0
          ? err.issues.map((i) => i.message).join(", ")
          : err?.message || "Invalid request";

      return res.status(400).json({
        success: false,
        message,
      });
    }
  };
};
