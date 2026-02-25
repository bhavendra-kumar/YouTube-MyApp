import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import authMiddleware from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendSuccess } from "../utils/apiResponse.js";
import upload from "../utils/upload.js";
import {
	loginSchema,
	logoutSchema,
	refreshSchema,
	registerSchema,
} from "../validators/auth.js";
import {
	getuser,
	login,
	logout,
	me,
	refresh,
	register,
	updateChannelMedia,
	updateprofile,
} from "../controllers/auth.js";

const routes = express.Router();

routes.post("/register", validate(registerSchema), asyncHandler(register));
routes.post("/login", validate(loginSchema), asyncHandler(login));
routes.post("/refresh", validate(refreshSchema), asyncHandler(refresh));
routes.post("/logout", validate(logoutSchema), asyncHandler(logout));
routes.get("/me", authMiddleware, asyncHandler(me));

// Minimal admin-only route to demonstrate RBAC
routes.get(
	"/admin/ping",
	authMiddleware,
	requireRole("admin"),
	asyncHandler(async (req, res) => {
		return sendSuccess(res, { ok: true }, 200);
	})
);

routes.get("/:id", asyncHandler(getuser));
routes.patch("/update/:id", authMiddleware, asyncHandler(updateprofile));

routes.post(
	"/media",
	authMiddleware,
	upload.fields([
		{ name: "avatar", maxCount: 1 },
		{ name: "banner", maxCount: 1 },
	]),
	asyncHandler(updateChannelMedia)
);

export default routes;
