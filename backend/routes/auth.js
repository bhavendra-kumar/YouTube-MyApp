import express from "express";
import { getuser, login, updateprofile } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.get("/:id", getuser);
routes.patch("/update/:id", updateprofile);
export default routes;