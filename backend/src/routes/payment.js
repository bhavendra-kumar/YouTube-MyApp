import express from "express";

import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createOrder, verifyPayment } from "../controllers/payment.js";

const routes = express.Router();

routes.post("/create-order", authMiddleware, asyncHandler(createOrder));
routes.post("/verify", authMiddleware, asyncHandler(verifyPayment));

export default routes;
