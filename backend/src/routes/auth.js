import express from "express";
import { validateRequest } from "zod-express-middleware";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../libs/validate-schema.js";
import {
  registerUser,
  loginUser,
  verifyEmail,
  resetPasswordRequest,
  verifyResetPasswordTokenAndResetPassword,
} from "../controllers/auth-controller.js";
import z from "zod";
const router = express.Router();

router.post(
  "/register",
  validateRequest({
    body: registerSchema,
  }),
  registerUser,
);
router.post(
  "/login",
  validateRequest({
    body: loginSchema,
  }),
  loginUser,
);

router.post(
  "/verify-email",
  validateRequest({
    body: verifyEmailSchema,
  }),
  verifyEmail,
);

router.post(
  "/reset-password-request",
  validateRequest({
    body: z.object({
      email: z.string().email(),
    }),
  }),
  resetPasswordRequest,
);

router.post(
  "/reset-password",
  validateRequest({
    body: resetPasswordSchema,
  }),
  verifyResetPasswordTokenAndResetPassword,
);

export default router;
