
import './App.css';
import './Theme.css';

import ProfilePage from "./ProfilePage.jsx";
import SettingsPage from "./SettingsPage.jsx";
import HelpPage from "./HelpPage.jsx";
import UpgradePage from "./UpgradePage.jsx";

import AuthPage from "./AuthPage.jsx";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import SharePage from "./SharePage.jsx";

import { MyContext } from "./MyContext.jsx";
import { useState, useEffect } from "react";
import { v1 as uuidv1 } from "uuid";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8080/api";


function MainApp() {
    // Application navigation
    const [activeView, setActiveView] = useState("chat");

    // Chat states
    const [prompt, setPrompt] = useState("");
    const [reply, setReply] = useState(null);
    const [currThreadId, setCurrThreadId] = useState(uuidv1());
    const [prevChats, setPrevChats] = useState([]);
    const [newChat, setNewChat] = useState(true);
    const [allThreads, setAllThreads] = useState([]);

    // Authentication states
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showAuth, setShowAuth] = useState(false);
    const [authMode, setAuthMode] = useState("login");

    // Theme preference
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("promptflow-theme") === "light"
            ? "light"
            : "dark";
    });

    // Chat preferences
    const [enterToSend, setEnterToSend] = useState(() => {
        return localStorage.getItem("promptflow-enter-to-send") !== "false";
    });

    const [confirmDelete, setConfirmDelete] = useState(() => {
        return localStorage.getItem("promptflow-confirm-delete") === "true";
    });


    // Check Passport session when application loads
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/auth/me`,
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                } else {
                    setUser(null);
                }

            } catch (error) {
                console.error("Authentication check failed:", error);
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        };

        checkAuth();
    }, []);


    // Apply and save theme
    useEffect(() => {
        document.documentElement.dataset.theme = theme;

        localStorage.setItem(
            "promptflow-theme",
            theme
        );
    }, [theme]);


    // Save Enter-to-send preference
    useEffect(() => {
        localStorage.setItem(
            "promptflow-enter-to-send",
            String(enterToSend)
        );
    }, [enterToSend]);


    // Save delete confirmation preference
    useEffect(() => {
        localStorage.setItem(
            "promptflow-confirm-delete",
            String(confirmDelete)
        );
    }, [confirmDelete]);


    // Shared application context
    const providerValues = {
        // Chat states
        prompt,
        setPrompt,

        reply,
        setReply,

        currThreadId,
        setCurrThreadId,

        newChat,
        setNewChat,

        prevChats,
        setPrevChats,

        allThreads,
        setAllThreads,

        // Authentication
        user,
        setUser,
        authLoading,

        showAuth,
        setShowAuth,
        authMode,
        setAuthMode,

        // Application navigation
        activeView,
        setActiveView,

        // Theme settings
        theme,
        setTheme,

        // Chat preferences
        enterToSend,
        setEnterToSend,

        confirmDelete,
        setConfirmDelete
    };


    // Show loading while checking session
    if (authLoading) {
        return (
            <div className="authLoading">
                Checking your session...
            </div>
        );
    }


    // Show Login or Signup only when requested
    if (showAuth) {
        return (
            <AuthPage
                initialMode={authMode}
                onAuthSuccess={(authenticatedUser) => {
                    setUser(authenticatedUser);
                    setShowAuth(false);
                    setActiveView("chat");
                }}
                onBack={() => setShowAuth(false)}
            />
        );
    }


    // Main application
    return (
        <div className={`app theme-${theme}`}>
            <MyContext.Provider value={providerValues}>

                <Sidebar />

                {activeView === "upgrade" ? (
                    <UpgradePage />
                ) : activeView === "profile" && user ? (
                    <ProfilePage />
                ) : activeView === "settings" ? (
                    <SettingsPage />
                ) : activeView === "help" ? (
                    <HelpPage />
                ) : (
                    <ChatWindow />
                )}

            </MyContext.Provider>
        </div>
    );
}


// Application entry point
function App() {

    // Public shared conversation route
    const shareMatch = window.location.pathname.match(
        /^\/share\/([^/]+)\/?$/
    );

    if (shareMatch) {
        return (
            <SharePage
                shareId={decodeURIComponent(shareMatch[1])}
            />
        );
    }

    return <MainApp />;
}

export default App;
