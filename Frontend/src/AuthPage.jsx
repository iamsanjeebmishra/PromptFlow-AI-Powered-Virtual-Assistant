
import { useState, useEffect } from "react";
import "./AuthPage.css";

const API_BASE_URL = "http://localhost:8080/api";

function AuthPage({ onAuthSuccess, initialMode = "login" }) {
    const [isLogin, setIsLogin] = useState(initialMode !== "signup");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Update the form whenever the requested auth mode changes
    useEffect(() => {
        setIsLogin(initialMode !== "signup");
        setError("");
        setPassword("");
    }, [initialMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const endpoint = isLogin
                ? "/auth/login"
                : "/auth/register";

            const body = isLogin
                ? { email, password }
                : { name, email, password };

            const response = await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Authentication failed"
                );
            }

            onAuthSuccess(data.user);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="authPage">

            <div className="authCard">

                <div className="authBrand">
                    <i className="fa-solid fa-comments"></i>
                    <span>PromptFlow</span>
                </div>

                <h1>
                    {isLogin
                        ? "Welcome back"
                        : "Create your account"}
                </h1>

                <p className="authSubtitle">
                    {isLogin
                        ? "Log in to continue your conversations."
                        : "Join PromptFlow and start exploring."}
                </p>

                <form onSubmit={handleSubmit}>

                    {!isLogin && (
                        <div className="authField">
                            <label>Full name</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
                                required
                                autoComplete="name"
                            />
                        </div>
                    )}

                    <div className="authField">
                        <label>Email address</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="authField">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            required
                            minLength={8}
                            autoComplete={
                                isLogin
                                    ? "current-password"
                                    : "new-password"
                            }
                        />
                    </div>

                    {error && (
                        <p className="authError">
                            {error}
                        </p>
                    )}

                    <button
                        className="authSubmitButton"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : isLogin
                                ? "Log in"
                                : "Create account"}
                    </button>

                </form>

                <div className="authSwitch">
                    {isLogin
                        ? "Don't have an account?"
                        : "Already have an account?"}

                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                            setPassword("");
                        }}
                    >
                        {isLogin ? "Sign up" : "Log in"}
                    </button>
                </div>

            </div>

        </div>
    );
}

export default AuthPage;
