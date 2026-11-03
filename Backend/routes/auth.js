
import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import User from "../models/User.js";

const router = express.Router();


// Return safe user information (never return password)
const getSafeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    profilePicture: user.profilePicture,
    createdAt: user.createdAt
});


// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        // Validate input
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                error: "Please provide name, email and password"
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        if (!normalizedEmail.includes("@")) {
            return res.status(400).json({
                error: "Please enter a valid email address"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must contain at least 8 characters"
            });
        }

        // Check whether user already exists
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                error: "Email is already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword
        });

        // Automatically log in after successful registration
        req.login(user, (error) => {
            if (error) {
                console.error("Registration login error:", error);

                return res.status(500).json({
                    error: "Account created, but login failed"
                });
            }

            return res.status(201).json({
                message: "Account created successfully",
                user: getSafeUser(user)
            });
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                error: "Email is already registered"
            });
        }

        return res.status(500).json({
            error: "Registration failed"
        });
    }
});


// LOGIN
router.post("/login", (req, res, next) => {

    passport.authenticate("local", (error, user, info) => {

        if (error) {
            return next(error);
        }

        if (!user) {
            return res.status(401).json({
                error: info?.message || "Invalid email or password"
            });
        }

        // Create authenticated session
        req.login(user, (loginError) => {

            if (loginError) {
                return next(loginError);
            }

            return res.status(200).json({
                message: "Login successful",
                user: getSafeUser(user)
            });
        });

    })(req, res, next);
});


// CHECK AUTHENTICATED USER
router.get("/me", (req, res) => {

    if (!req.isAuthenticated()) {
        return res.status(401).json({
            authenticated: false,
            error: "User is not authenticated"
        });
    }

    return res.status(200).json({
        authenticated: true,
        user: getSafeUser(req.user)
    });
});


// LOGOUT
router.post("/logout", (req, res, next) => {

    req.logout((error) => {

        if (error) {
            return next(error);
        }

        if (!req.session) {
            return res.status(200).json({
                message: "Logout successful"
            });
        }

        req.session.destroy((destroyError) => {

            if (destroyError) {
                return next(destroyError);
            }

            res.clearCookie("promptflow.sid", {
                path: "/"
            });

            return res.status(200).json({
                message: "Logout successful"
            });
        });
    });
});


export default router;
