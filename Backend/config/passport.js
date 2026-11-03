
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const configurePassport = (passport) => {

    // Local Strategy: authenticate using email and password
    passport.use(
        new LocalStrategy(
            {
                usernameField: "email",
                passwordField: "password"
            },

            async (email, password, done) => {
                try {
                    // Find user by normalized email
                    const user = await User.findOne({
                        email: email.trim().toLowerCase()
                    }).select("+password");

                    if (!user) {
                        return done(null, false, {
                            message: "Invalid email or password"
                        });
                    }

                    // Compare entered password with hashed password
                    const isMatch = await bcrypt.compare(
                        password,
                        user.password
                    );

                    if (!isMatch) {
                        return done(null, false, {
                            message: "Invalid email or password"
                        });
                    }

                    return done(null, user);

                } catch (error) {
                    return done(error);
                }
            }
        )
    );


    // Store user ID in session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });


    // Retrieve user using stored ID
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);

            if (!user) {
                return done(null, false);
            }

            return done(null, user);

        } catch (error) {
            return done(error);
        }
    });

};

export default configurePassport;
