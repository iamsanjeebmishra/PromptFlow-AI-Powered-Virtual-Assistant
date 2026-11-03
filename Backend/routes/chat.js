
import express from "express";
import { randomUUID } from "node:crypto";

import Thread from "../models/Thread.js";
import SharedConversation from "../models/SharedConversation.js";

import getOpenAiAPIResponse, {
    generateChatTitle
} from "../utils/openai.js";

const router = express.Router();


// Test route
router.post("/test", async (req, res) => {
    try {
        const thread = new Thread({
            threadId: "imiss you",
            title: "Testing new thread3"
        });

        const response = await thread.save();
        res.send(response);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Failed to save in DB"
        });
    }
});


// Get all threads, sorted by updatedAt
router.get("/thread", async (req, res) => {
    try {
        const threads = await Thread.find({}).sort({ updatedAt: -1 });
        res.json(threads);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Failed to fetch threads"
        });
    }
});


// Get messages of a particular thread
router.get("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await Thread.findOne({ threadId });

        if (!thread) {
            return res.status(404).json({
                error: "Thread not found"
            });
        }

        return res.json(thread.messages);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Failed to fetch chat"
        });
    }
});


// Delete a particular thread
router.delete("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;

    try {
        const deletedThread = await Thread.findOneAndDelete({ threadId });

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
        res.status(500).json({
            error: "Failed to delete the thread"
        });
    }
});


// Create a read-only snapshot of a conversation
router.post("/thread/:threadId/share", async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await Thread.findOne({ threadId });

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
        res.status(500).json({
            error: "Failed to create shared conversation"
        });
    }
});


// Retrieve a shared conversation
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
        res.status(500).json({
            error: "Failed to fetch shared conversation"
        });
    }
});


// Regenerate the latest assistant response
router.post("/chat/:threadId/regenerate", async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await Thread.findOne({ threadId });

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

        // Keep the complete history except the previous assistant answer
        const conversationHistory = messages
            .slice(0, -1)
            .map((message) => ({
                role: message.role,
                content: message.content
            }));

        const assistantReply = await getOpenAiAPIResponse(
            conversationHistory
        );

        // Replace the existing assistant answer
        const lastMessage = thread.messages[thread.messages.length - 1];

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
        res.status(500).json({
            error: "Failed to regenerate response"
        });
    }
});


// Chat route with AI-generated title and conversation memory
router.post("/chat", async (req, res) => {
    const { threadId, message } = req.body;

    if (!threadId || !message) {
        return res.status(400).json({
            error: "Missing required fields"
        });
    }

    try {
        let thread = await Thread.findOne({ threadId });

        if (!thread) {
            const title = await generateChatTitle(message);

            thread = new Thread({
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
            thread.messages.push({
                role: "user",
                content: message
            });
        }

        // Send conversation history to OpenAI
        const conversationHistory = thread.messages.map((chatMessage) => ({
            role: chatMessage.role,
            content: chatMessage.content
        }));

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
        res.status(500).json({
            error: "Something went wrong"
        });
    }
});


export default router;
