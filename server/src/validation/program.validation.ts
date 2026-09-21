import mongoose from "mongoose";
import { z } from "zod";

export const programIdParamSchema = z.object({
  id: z
    .string({ message: "Invalid program ID" })
    .refine((val) => mongoose.isObjectIdOrHexString(val), {
      message: "Invalid program ID",
    }),
});

export type ProgramIdParamInput = z.infer<typeof programIdParamSchema>;
