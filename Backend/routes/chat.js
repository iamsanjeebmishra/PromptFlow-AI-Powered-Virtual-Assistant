import express from "express";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import path from "node:path";

import Thread from "../models/Thread.js";
import SharedConversation from "../models/SharedConversation.js";

import getOpenAiAPIResponse, {
    generateChatTitle
} from "../utils/openai.js";

const router = express.Router();

const MAX_IMAGES_PER_MESSAGE = 3;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3 MB per image

const ALLOWED_IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp"
]);

let imageBucket;

// GridFS bucket is created after the MongoDB connection is established.
const getImageBucket = () => {
    if (!mongoose.connection.db) {
        throw new Error("MongoDB is not connected");
    }

    if (!imageBucket) {
        imageBucket = new mongoose.mongo.GridFSBucket(
            mongoose.connection.db,
            { bucketName: "chatImages" }
        );
    }

    return imageBucket;
};


// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            error: "Please log in to continue"
        });
    }

    next();
};


// Convert the frontend's Base64 data URL into a validated image buffer.
const parseIncomingImages = (images) => {
    if (images === undefined) return [];

    if (!Array.isArray(images)) {
        throw new Error("Images must be provided as an array");
    }

    if (images.length > MAX_IMAGES_PER_MESSAGE) {
        throw new Error(
            `You can upload up to ${MAX_IMAGES_PER_MESSAGE} images per message`
        );
    }

    return images.map((image) => {
        if (!image || typeof image.dataUrl !== "string") {
            throw new Error("An image is missing its data URL");
        }

        const match = image.dataUrl.match(
            /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/
        );

        if (!match) {
            throw new Error(
                "Only PNG, JPEG, and WEBP images are supported"
            );
        }

        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");

        if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
            throw new Error("Unsupported image type");
        }

        if (image.mimeType && image.mimeType !== mimeType) {
            throw new Error(
                "Image MIME type does not match its data URL"
            );
        }

        if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE) {
            throw new Error(
                "Each image must be smaller than or equal to 3 MB"
            );
        }

        const fallbackExtension = mimeType === "image/jpeg"
            ? ".jpg"
            : mimeType === "image/png"
                ? ".png"
                : ".webp";

        const suppliedName = typeof image.name === "string"
            ? path.basename(image.name).slice(0, 200)
            : "";

        return {
            filename: suppliedName ||
                `image-${randomUUID()}${fallbackExtension}`,
            mimeType,
            buffer
        };
    });
};


// Upload one image buffer to MongoDB GridFS.
const uploadImage = (image, ownerId) =>
    new Promise((resolve, reject) => {
        const bucket = getImageBucket();

        const uploadStream = bucket.openUploadStream(
            image.filename,
            {
                metadata: {
                    ownerId: String(ownerId),
                    mimeType: image.mimeType
                }
            }
        );

        uploadStream.once("error", reject);

        uploadStream.once("finish", () => {
            resolve({
                fileId: uploadStream.id,
                filename: image.filename,
                mimeType: image.mimeType,
                size: image.buffer.length
            });
        });

        Readable.from(image.buffer).pipe(uploadStream);
    });


// Remove GridFS files if the corresponding chat request fails.
const deleteUploadedImages = async (images) => {
    if (!images.length) return;

    const bucket = getImageBucket();

    await Promise.allSettled(
        images.map(({ fileId }) => bucket.delete(fileId))
    );
};


// Read a GridFS image into a buffer for the OpenAI vision request.
const readImageBuffer = (fileId) =>
    new Promise((resolve, reject) => {
        const bucket = getImageBucket();
        const chunks = [];

        const downloadStream = bucket.openDownloadStream(fileId);

        downloadStream.on("data", (chunk) => {
            chunks.push(chunk);
        });

        downloadStream.once("error", reject);

        downloadStream.once("end", () => {
            resolve(Buffer.concat(chunks));
        });
    });


// Build OpenAI-compatible history, including images from earlier messages.
const buildOpenAIMessages = async (messages) =>
    Promise.all(
        messages.map(async (message) => {
            const images = message.images || [];

            if (message.role !== "user" || images.length === 0) {
                return {
                    role: message.role,
                    content: message.content
                };
            }

            const content = [];

            if (message.content && message.content.trim()) {
                content.push({
                    type: "text",
                    text: message.content
                });
            }

            for (const image of images) {
                const buffer = await readImageBuffer(image.fileId);
                const base64 = buffer.toString("base64");

                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${image.mimeType};base64,${base64}`,
                        detail: "high"
                    }
                });
            }

            return {
                role: "user",
                content
            };
        })
    );


const getBaseUrl = (req) =>
    `${req.protocol}://${req.get("host")}`;


// Return messages with image URLs that the frontend can use in img tags.
const formatMessagesForClient = (req, messages, shareId = null) =>
    messages.map((message) => ({
        _id: message._id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,

        images: (message.images || []).map((image) => ({
            fileId: String(image.fileId),
            filename: image.filename,
            mimeType: image.mimeType,
            size: image.size,

            url: shareId
                ? `${getBaseUrl(req)}/api/share/${shareId}/image/${image.fileId}`
                : `${getBaseUrl(req)}/api/image/${image.fileId}`
        }))
    }));


// Stream a stored image after its access check has succeeded.
const streamStoredImage = async (
    fileId,
    res,
    cacheControl = "private, max-age=3600"
) => {
    const bucket = getImageBucket();

    const files = await bucket.find({
        _id: fileId
    }).toArray();

    const file = files[0];

    if (!file) return false;

    res.set("Content-Type", file.metadata?.mimeType ||
        "application/octet-stream");

    res.set("Content-Length", String(file.length));
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", cacheControl);

    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.once("error", (error) => {
        console.error("Image download error:", error);

        if (!res.headersSent) {
            res.status(404).json({
                error: "Image not found"
            });
        } else {
            res.destroy(error);
        }
    });

    downloadStream.pipe(res);

    return true;
};


// PUBLIC ROUTE: Retrieve a shared image.
// The image is visible only when it belongs to this shared snapshot.
router.get("/share/:shareId/image/:fileId", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.fileId)) {
            return res.status(404).json({
                error: "Image not found"
            });
        }

        const fileId = new mongoose.Types.ObjectId(
            req.params.fileId
        );

        const sharedConversation = await SharedConversation.exists({
            shareId: req.params.shareId,
            "messages.images.fileId": fileId
        });

        if (!sharedConversation) {
            return res.status(404).json({
                error: "Image not found"
            });
        }

        const found = await streamStoredImage(
            fileId,
            res,
            "public, max-age=3600"
        );

        if (!found) {
            return res.status(404).json({
                error: "Image not found"
            });
        }
    }
    catch (error) {
        console.error(error);

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Failed to fetch image"
            });
        }
    }
});


// PUBLIC ROUTE: Retrieve a shared conversation snapshot.
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

            messages: formatMessagesForClient(
                req,
                sharedConversation.messages,
                shareId
            ),

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


// All routes below this point require authentication.
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


// Get only the logged-in user's threads.
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


// Get messages from a particular user's thread.
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

        return res.json(
            formatMessagesForClient(req, thread.messages)
        );
    }
    catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to fetch chat"
        });
    }
});


// Retrieve a private image only if it belongs to the logged-in user's thread.
router.get("/image/:fileId", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.fileId)) {
            return res.status(404).json({
                error: "Image not found"
            });
        }

        const fileId = new mongoose.Types.ObjectId(
            req.params.fileId
        );

        const belongsToUser = await Thread.exists({
            userId: req.user._id,
            "messages.images.fileId": fileId
        });

        if (!belongsToUser) {
            return res.status(404).json({
                error: "Image not found"
            });
        }

        const found = await streamStoredImage(fileId, res);

        if (!found) {
            return res.status(404).json({
                error: "Image not found"
            });
        }
    }
    catch (error) {
        console.error(error);

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Failed to fetch image"
            });
        }
    }
});


// Delete only the logged-in user's thread.
// GridFS files are retained because a shared snapshot may still reference them.
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


// Create a shareable snapshot of the logged-in user's conversation.
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

                images: (message.images || []).map((image) => ({
                    fileId: image.fileId,
                    filename: image.filename,
                    mimeType: image.mimeType,
                    size: image.size
                })),

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


// Regenerate the latest response, retaining images in conversation history.
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

        // Keep conversation history except the previous assistant answer.
        const conversationHistory = await buildOpenAIMessages(
            messages.slice(0, -1)
        );

        const assistantReply = await getOpenAiAPIResponse(
            conversationHistory
        );

        // Replace the previous response.
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


// Chat route with text and image input.
router.post("/chat", async (req, res) => {
    const { threadId } = req.body;

    const message = typeof req.body.message === "string"
        ? req.body.message.trim()
        : "";

    let parsedImages;

    try {
        if (typeof threadId !== "string" || !threadId.trim()) {
            return res.status(400).json({
                error: "Missing threadId"
            });
        }

        parsedImages = parseIncomingImages(req.body.images);

        if (!message && parsedImages.length === 0) {
            return res.status(400).json({
                error: "Enter a message or attach at least one image"
            });
        }
    }
    catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }

    const uploadedImages = [];

    try {
        const currentUserId = req.user._id;

        const storedMessage = message ||
            "Please analyze the attached image(s).";

        let thread = await Thread.findOne({
            threadId,
            userId: currentUserId
        });

        if (!thread) {
            // Prevent using another user's existing thread ID.
            const threadExists = await Thread.exists({ threadId });

            if (threadExists) {
                return res.status(404).json({
                    error: "Thread not found"
                });
            }

            // Generate a title for a new conversation.
            const title = await generateChatTitle(
                message || "Image analysis"
            );

            thread = new Thread({
                userId: currentUserId,
                threadId,
                title,
                messages: []
            });
        }

        // Upload image files to GridFS and store their references in Thread.
        for (const image of parsedImages) {
            const storedImage = await uploadImage(
                image,
                currentUserId
            );

            uploadedImages.push(storedImage);
        }

        // Add user message and its image references.
        thread.messages.push({
            role: "user",
            content: storedMessage,
            images: uploadedImages
        });

        // Build full conversation history, including previous images.
        const conversationHistory = await buildOpenAIMessages(
            thread.messages
        );

        const assistantReply = await getOpenAiAPIResponse(
            conversationHistory
        );

        // Store assistant response.
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
        console.error("Chat route error:", error);

        // Avoid orphaning uploaded images if the chat request fails.
        try {
            await deleteUploadedImages(uploadedImages);
        }
        catch (cleanupError) {
            console.error(
                "Image cleanup error:",
                cleanupError
            );
        }

        if (error.code === 11000) {
            return res.status(409).json({
                error: "This conversation already exists"
            });
        }

        return res.status(500).json({
            error: error.message || "Something went wrong"
        });
    }
});


export default router;