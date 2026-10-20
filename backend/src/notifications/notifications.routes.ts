import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notifications.store.js";

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get("/", (req, res) => {
  const user = req.user!;
  const notifications = getNotificationsForUser(user);
  res.json({ data: notifications });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", (req, res) => {
  const user = req.user!;
  const id = req.params["id"];
  if (id) {
    markNotificationAsRead(user, id);
  }
  res.json({ success: true });
});

// POST /api/notifications/read-all
router.post("/read-all", (req, res) => {
  const user = req.user!;
  markAllNotificationsAsRead(user);
  res.json({ success: true });
});

export default router;
