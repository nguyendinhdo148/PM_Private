// routes/chat.js
import express from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import authMiddleware from "../middleware/auth-middleware.js";
import {
  getOrCreateDirectConversation,
  getWorkspaceConversation,
  getProjectConversation,
  sendMessage,
  getMessages,
  getUserConversations,
  updateMessage,
  deleteMessage,
  addReaction,
  markConversationAsRead,
} from "../controllers/chat.js";

const router = express.Router();

// Get all conversations for current user
router.get("/conversations", authMiddleware, getUserConversations);

// Direct message routes
router.get(
  "/conversations/direct/:userId",
  authMiddleware,
  validateRequest({
    params: z.object({
      userId: z.string(),
    }),
  }),
  getOrCreateDirectConversation
);

// Workspace chat routes
router.get(
  "/conversations/workspace/:workspaceId",
  authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string(),
    }),
  }),
  getWorkspaceConversation
);

// Project chat routes
router.get(
  "/conversations/project/:projectId",
  authMiddleware,
  validateRequest({
    params: z.object({
      projectId: z.string(),
    }),
  }),
  getProjectConversation
);

// Message routes
router.get(
  "/conversations/:conversationId/messages",
  authMiddleware,
  validateRequest({
    params: z.object({
      conversationId: z.string(),
    }),
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  }),
  getMessages
);

router.post(
  "/conversations/:conversationId/messages",
  authMiddleware,
  validateRequest({
    params: z.object({
      conversationId: z.string(),
    }),
    body: z.object({
      content: z.string().min(1),
      type: z.enum(["text", "image", "file", "system"]).optional(),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
      })).optional(),
      replyToId: z.string().optional(),
      mentions: z.array(z.object({
        user: z.string(),
        offset: z.number(),
        length: z.number(),
      })).optional(),
    }),
  }),
  sendMessage
);

router.put(
  "/messages/:messageId",
  authMiddleware,
  validateRequest({
    params: z.object({
      messageId: z.string(),
    }),
    body: z.object({
      content: z.string().min(1),
    }),
  }),
  updateMessage
);

router.delete(
  "/messages/:messageId",
  authMiddleware,
  validateRequest({
    params: z.object({
      messageId: z.string(),
    }),
  }),
  deleteMessage
);

router.post(
  "/messages/:messageId/reactions",
  authMiddleware,
  validateRequest({
    params: z.object({
      messageId: z.string(),
    }),
    body: z.object({
      emoji: z.string(),
    }),
  }),
  addReaction
);

router.post(
  "/conversations/:conversationId/read",
  authMiddleware,
  validateRequest({
    params: z.object({
      conversationId: z.string(),
    }),
  }),
  markConversationAsRead
);

export default router;