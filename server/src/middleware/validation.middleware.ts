import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

export interface RequestValidationSchema {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Reusable Express middleware for request validation using Zod schemas.
 * Validates body, params, and/or query, and passes any ZodError to next().
 */
export const validateRequest = (schema: RequestValidationSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as typeof req.params;
      }
      if (schema.query) {
        const validatedQuery = await schema.query.parseAsync(req.query);
        Object.defineProperty(req, "query", {
          value: validatedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateBody = (schema: ZodType) => validateRequest({ body: schema });
export const validateParams = (schema: ZodType) => validateRequest({ params: schema });
export const validateQuery = (schema: ZodType) => validateRequest({ query: schema });

export default validateRequest;
