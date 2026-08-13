import { z } from "zod";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .refine((val) => val.trim().length > 0, { message: "Name is required" }),
  email: z
    .string({ message: "Email is required" })
    .refine((val) => val.trim().length > 0, { message: "Email is required" })
    .refine((val) => EMAIL_PATTERN.test(val.trim().toLowerCase()), {
      message: "A valid email is required",
    }),
  password: z
    .string({ message: "Password is required" })
    .refine((val) => val.length > 0, { message: "Password is required" })
    .refine((val) => val.length >= 8, { message: "Password must be at least 8 characters" }),
});

export const loginSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .refine((val) => val.trim().length > 0, { message: "Email is required" })
    .refine((val) => EMAIL_PATTERN.test(val.trim().toLowerCase()), {
      message: "A valid email is required",
    }),
  password: z
    .string({ message: "Password is required" })
    .refine((val) => val.length > 0, { message: "Password is required" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
