import { z } from "zod";

const email = z.string().email("Invalid email");
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const registerSchema = z.object({
  body: z.object({
    email,
    password,
    name: z.string().min(1).max(120).optional(),
    image: z.string().url().optional(),
  }),
});

// Backward compatible: if password is omitted we treat it like social login
export const loginSchema = z.object({
  body: z.object({
    email,
    password: password.optional(),
    name: z.string().min(1).max(120).optional(),
    image: z.string().url().optional(),
  }),
});

export const refreshSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

export const logoutSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});
