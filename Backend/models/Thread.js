
import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    }
}, { _id: false });


const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    images: {
        type: [ImageSchema],
        default: []
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});


const ThreadSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    threadId: {
        type: String,
        required: true,
        unique: true
    },

    title: {
        type: String,
        default: "New Chat"
    },

    messages: [MessageSchema],

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Thread", ThreadSchema);
