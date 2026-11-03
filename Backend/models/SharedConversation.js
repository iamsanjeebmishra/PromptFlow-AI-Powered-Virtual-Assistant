
import mongoose from "mongoose";

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
