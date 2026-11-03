import mongoose from "mongoose";

// Image attachment metadata
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


const SharedMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },

    content: {
        type: String,
        required: true
    },

    // Store references to attached images
    images: {
        type: [ImageSchema],
        default: []
    },

    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });


const SharedConversationSchema = new mongoose.Schema({
    shareId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    title: {
        type: String,
        default: "Shared conversation"
    },

    messages: {
        type: [SharedMessageSchema],
        default: []
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


export default mongoose.model(
    "SharedConversation",
    SharedConversationSchema
);