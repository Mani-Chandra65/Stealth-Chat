import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
    getPendingRequests,
    getConnections,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest
} from "./connection.controller.js";

const router = Router();

router.get("/pending", authenticate, getPendingRequests);
router.get("/list", authenticate, getConnections);
router.post("/request", authenticate, sendConnectionRequest);
router.post("/accept/:connectionId", authenticate, acceptConnectionRequest);
router.post("/reject/:connectionId", authenticate, rejectConnectionRequest);

export default router;
