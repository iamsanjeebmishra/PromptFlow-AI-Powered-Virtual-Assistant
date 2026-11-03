import authRoutes from "./routes/auth.js";
import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";

import chatRoutes from "./routes/chat.js";
import configurePassport from "./config/passport.js";

const app = express();
const PORT = process.env.PORT || 8080;

const isProduction = process.env.NODE_ENV === "production";


// Trust hosting proxy in production
if (isProduction) {
    app.set("trust proxy", 1);
}


// Parse incoming JSON
app.use(express.json());


// CORS configuration
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000"
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true
    })
);


// Connect MongoDB and start server
const startServer = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            throw new Error("MONGODB_URL is missing from .env");
        }

        if (!process.env.SESSION_SECRET) {
            throw new Error("SESSION_SECRET is missing from .env");
        }

        // Connect MongoDB
        await mongoose.connect(process.env.MONGODB_URL);

        console.log("Successfully connected to MongoDB");


        // MongoDB session store
        const sessionStore = MongoStore.create({
            client: mongoose.connection.getClient(),
            collectionName: "sessions",
            ttl: 14 * 24 * 60 * 60,
            autoRemove: "native"
        });


        // Express session configuration
        app.use(
            session({
                name: "promptflow.sid",
                secret: process.env.SESSION_SECRET,
                store: sessionStore,
                resave: false,
                saveUninitialized: false,

                cookie: {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: isProduction ? "none" : "lax",
                    maxAge: 14 * 24 * 60 * 60 * 1000
                }
            })
        );


        // Configure Passport Local Strategy
        configurePassport(passport);

        // Initialize Passport
        app.use(passport.initialize());

        // Enable persistent login sessions
        app.use(passport.session());

        app.use("/api/auth", authRoutes);
        // Existing chat routes
        app.use("/api", chatRoutes);


        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};


startServer();
