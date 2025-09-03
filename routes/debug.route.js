// routes/debug.route.js
import express from "express";
import { verifySmtp } from "../services/email.service.js";

const router = express.Router();
router.get("/email", async (req, res) => {
    try {
        await verifySmtp();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
export default router;


