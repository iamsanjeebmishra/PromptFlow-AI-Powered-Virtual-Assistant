
import express from "express";
import { randomUUID } from "node:crypto";

import Thread from "../models/Thread.js";
import SharedConversation from "../models/SharedConversation.js";

import getOpenAiAPIResponse, {
    generateChatTitle
} from "../utils/openai.js";

const router = express.Router();


// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in to continue"
        });
    }

    next();
};


// PUBLIC ROUTE: Retrieve a shared conversation
// Anyone with the share link can view its snapshot
router.get("/share/:shareId", async (req, res) => {
    const { shareId } = req.params;

    try {
        const sharedConversation =
            await SharedConversation.findOne({ shareId });

        if (!sharedConversation) {
            return res.status(404).json({
                error: "Shared conversation not found"
            });
        }

        return res.json({
            title: sharedConversation.title,
            messages: sharedConversation.messages,
            createdAt: sharedConversation.createdAt
        });
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to fetch shared conversation"
        });
    }
});


// All routes below this point require authentication
router.use(requireAuth);


// Test route
router.post("/test", async (req, res) => {
    try {
        const thread = new Thread({
            userId: req.user._id,
            threadId: randomUUID(),
            title: "Testing new thread"
        });

        const response = await thread.save();

        return res.send(response);
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to save in DB"
        });
    }
});


// Get only the logged-in user's threads
router.get("/thread", async (req, res) => {
    try {
        const threads = await Thread.find({
            userId: req.user._id
        }).sort({ updatedAt: -1 });

        return res.json(threads);
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to fetch threads"
        });
    }
});


// Get messages from a particular user's thread
router.get("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await Thread.findOne({
            threadId,
            userId: req.user._id
        });

        if (!thread) {
            return res.status(404).json({
                error: "Thread not found"
            });
        }

        return res.json(thread.messages);
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to fetch chat"
        });
    }
});


// Delete only the logged-in user's thread
router.delete("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;

    try {
        const deletedThread = await Thread.findOneAndDelete({
            threadId,
            userId: req.user._id
        });

        if (!deletedThread) {
            return res.status(404).json({
                error: "Thread not found"
            });
        }

        return res.status(200).json({
            success: "Thread deleted successfully"
        });
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to delete the thread"
        });
    }
});


// Create a shareable snapshot of the logged-in user's conversation
router.post("/thread/:threadId/share", async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await Thread.findOne({
            threadId,
            userId: req.user._id
        });

        if (!thread) {
            return res.status(404).json({
                error: "Thread not found"
            });
        }

        if (!thread.messages || thread.messages.length === 0) {
            return res.status(400).json({
                error: "Cannot share an empty conversation"
            });
        }

        const shareId = randomUUID();

        const sharedConversation = new SharedConversation({
            shareId,
            title: thread.title,
            messages: thread.messages.map((message) => ({
                role: message.role,
                content: message.content,
                timestamp: message.timestamp
            }))
        });

        await sharedConversation.save();

        return res.status(201).json({
            success: true,
            shareId
        });
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to create shared conversation"
        });
    }
});


// Regenerate the latest response of the logged-in user's thread
router.post("/chat/:threadId/regenerate", async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await Thread.findOne({
            threadId,
            userId: req.user._id
        });

        if (!thread) {
            return res.status(404).json({
                error: "Thread not found"
            });
        }

        const messages = thread.messages;

        if (
            messages.length < 2 ||
            messages[messages.length - 1].role !== "assistant" ||
            messages[messages.length - 2].role !== "user"
        ) {
            return res.status(400).json({
                error: "No assistant response available to regenerate"
            });
        }

        // Keep conversation history except previous assistant answer
        const conversationHistory = messages
            .slice(0, -1)
            .map((message) => ({
                role: message.role,
                content: message.content
            }));

        const assistantReply = await getOpenAiAPIResponse(
            conversationHistory
        );

        // Replace the previous response
        const lastMessage =
            thread.messages[thread.messages.length - 1];

        lastMessage.content = assistantReply;
        lastMessage.timestamp = new Date();

        thread.updatedAt = new Date();

        await thread.save();

        return res.json({
            reply: assistantReply,
            threadId: thread.threadId
        });
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to regenerate response"
        });
    }
});


// Chat route with AI-generated title and conversation memory
router.post("/chat", async (req, res) => {
    const { threadId, message } = req.body;

    if (
        typeof threadId !== "string" ||
        typeof message !== "string" ||
        !threadId.trim() ||
        !message.trim()
    ) {
        return res.status(400).json({
            error: "Missing required fields"
        });
    }

    try {
        const currentUserId = req.user._id;

        let thread = await Thread.findOne({
            threadId,
            userId: currentUserId
        });

        if (!thread) {
            // Prevent using another user's existing thread ID
            const threadExists = await Thread.exists({ threadId });

            if (threadExists) {
                return res.status(404).json({
                    error: "Thread not found"
                });
            }

            // Generate AI title for a new conversation
            const title = await generateChatTitle(message);

            thread = new Thread({
                userId: currentUserId,
                threadId,
                title,
                messages: [
                    {
                        role: "user",
                        content: message
                    }
                ]
            });
        }
        else {
            // Add message to the authenticated user's conversation
            thread.messages.push({
                role: "user",
                content: message
            });
        }

        // Send conversation history to OpenAI
        const conversationHistory = thread.messages.map(
            (chatMessage) => ({
                role: chatMessage.role,
                content: chatMessage.content
            })
        );

        const assistantReply = await getOpenAiAPIResponse(
            conversationHistory
        );

        thread.messages.push({
            role: "assistant",
            content: assistantReply
        });

        thread.updatedAt = new Date();

        await thread.save();

        return res.json({
            reply: assistantReply,
            threadId: thread.threadId,
            title: thread.title
        });
    }
    catch (error) {
        console.log(error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: "This conversation already exists"
            });
        }

        return res.status(500).json({
            error: "Something went wrong"
        });
    }
});


export default router;
