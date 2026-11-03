
import express from "express";
import Thread from "../models/Thread.js";
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
        res.status(500).json({ error: "Failed to save in DB" });
    }
});


// Get all threads and sort in descending order of updatedAt
router.get("/thread", async (req, res) => {
    try {
        const threads = await Thread.find({}).sort({ updatedAt: -1 });
        res.json(threads);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to fetch threads" });
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

        res.json(thread.messages);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to fetch chat" });
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

        res.status(200).json({
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
            // Generate AI title only for a new conversation
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
            // Add new user message to existing conversation
            thread.messages.push({
                role: "user",
                content: message
            });
        }

        // Prepare complete conversation history for OpenAI
        const conversationHistory = thread.messages.map((chatMessage) => ({
            role: chatMessage.role,
            content: chatMessage.content
        }));

        // Generate response using the complete conversation history
        const assistantReply = await getOpenAiAPIResponse(
            conversationHistory
        );

        // Save assistant response
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

        return res.status(500).json({
            error: "Something went wrong"
        });
    }
});


export default router;
