import type { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { badRequest } from "../utils/errors";

export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const flattened = result.error.flatten();
      const fieldErrorList = Object.values(flattened.fieldErrors)
        .flat()
        .filter((msg): msg is string => typeof msg === "string" && msg.length > 0);
      const firstMessage =
        fieldErrorList[0] ||
        flattened.formErrors[0] ||
        "Données invalides. Veuillez vérifier les champs du formulaire.";
      return next(badRequest(firstMessage, flattened));
    }
    req[source] = result.data as never;
    next();
  };
