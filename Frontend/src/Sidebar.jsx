
import "./Sidebar.css";
import { useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";

const API_BASE_URL = "http://localhost:8080/api";


// Generate initials from user's name
const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "U";

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (
        parts[0][0] + parts[parts.length - 1][0]
    ).toUpperCase();
};


function Sidebar() {
    const {
        allThreads,
        setAllThreads,
        currThreadId,
        setNewChat,
        setPrompt,
        setReply,
        setCurrThreadId,
        setPrevChats,

        // Authentication
        user,
        setUser,
        setShowAuth,
        setAuthMode,

        // Navigation
        setActiveView,

        // Preferences
        theme,
        setTheme,
        confirmDelete
    } = useContext(MyContext);

    const [searchQuery, setSearchQuery] = useState("");
    const [pinnedThreads, setPinnedThreads] = useState([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const currentUserId = user?.id || user?._id;

    // Keep pinned chats separate for each user
    const pinStorageKey = currentUserId
        ? `promptflow-pinned-chats-${currentUserId}`
        : null;


    // Open login or signup
    const openAuth = (mode) => {
        setAuthMode(mode);
        setShowAuth(true);
        setIsProfileOpen(false);
    };


    // Navigate to application views
    const openView = (view) => {
        setActiveView(view);
        setIsProfileOpen(false);
    };


    // Toggle between dark and light themes
    const toggleTheme = () => {
        setTheme((currentTheme) =>
            currentTheme === "dark" ? "light" : "dark"
        );
    };


    // Clear private application data after session expires
    const clearPrivateData = () => {
        setAllThreads([]);
        setPrevChats([]);
        setReply(null);
        setNewChat(true);
        setCurrThreadId(uuidv1());
        setUser(null);
        setActiveView("chat");
    };


    // Load pinned chats for the logged-in user
    useEffect(() => {
        if (!pinStorageKey) {
            setPinnedThreads([]);
            return;
        }

        try {
            const savedPins = JSON.parse(
                localStorage.getItem(pinStorageKey) || "[]"
            );

            setPinnedThreads(
                Array.isArray(savedPins) ? savedPins : []
            );
        } catch (error) {
            console.error("Error loading pinned chats:", error);
            setPinnedThreads([]);
        }

    }, [pinStorageKey]);


    // Fetch only the logged-in user's conversations
    useEffect(() => {
        if (!currentUserId) {
            setAllThreads([]);
            return;
        }

        let cancelled = false;

        const getAllThreads = async () => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/thread`,
                    {
                        credentials: "include"
                    }
                );

                if (response.status === 401) {
                    if (!cancelled) clearPrivateData();
                    return;
                }

                if (!response.ok) {
                    throw new Error("Failed to fetch conversations");
                }

                const res = await response.json();

                const filterData = res.map((thread) => ({
                    threadId: thread.threadId,
                    title: thread.title
                }));

                if (!cancelled) {
                    setAllThreads(filterData);
                }

            } catch (error) {
                if (!cancelled) {
                    console.error("Error fetching threads:", error);
                }
            }
        };

        getAllThreads();

        return () => {
            cancelled = true;
        };

    }, [currentUserId, setAllThreads]);


    // Create a new chat
    const createNewChat = () => {

        // Guests must log in before starting a new chat
        if (!user) {
            openAuth("login");
            return;
        }

        setActiveView("chat");
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
        setIsProfileOpen(false);
    };


    // Open an existing chat
    const changeThread = async (newThreadId) => {
        if (!user) {
            openAuth("login");
            return;
        }

        setActiveView("chat");
        setCurrThreadId(newThreadId);

        try {
            const response = await fetch(
                `${API_BASE_URL}/thread/${encodeURIComponent(newThreadId)}`,
                {
                    credentials: "include"
                }
            );

            if (response.status === 401) {
                clearPrivateData();
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to load conversation");
            }

            const res = await response.json();

            setPrevChats(res);
            setNewChat(false);
            setReply(null);

        } catch (error) {
            console.error("Error loading thread:", error);
        }
    };


    // Delete a chat
    const deleteThread = async (threadId) => {
        if (!user) return;

        // Ask for confirmation when enabled in Settings
        if (
            confirmDelete &&
            !window.confirm("Are you sure you want to delete this conversation?")
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/thread/${encodeURIComponent(threadId)}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );

            if (response.status === 401) {
                clearPrivateData();
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to delete chat");
            }

            setAllThreads((prev) =>
                prev.filter((thread) => thread.threadId !== threadId)
            );

            // Also remove it from this user's pinned chats
            const updatedPins = pinnedThreads.filter(
                (id) => id !== threadId
            );

            setPinnedThreads(updatedPins);

            if (pinStorageKey) {
                localStorage.setItem(
                    pinStorageKey,
                    JSON.stringify(updatedPins)
                );
            }

            if (threadId === currThreadId) {
                createNewChat();
            }

        } catch (error) {
            console.error("Error deleting thread:", error);
        }
    };


    // Pin or unpin a chat
    const togglePin = (e, threadId) => {
        e.stopPropagation();

        if (!pinStorageKey || !user) return;

        let updatedPins;

        if (pinnedThreads.includes(threadId)) {
            updatedPins = pinnedThreads.filter(
                (id) => id !== threadId
            );
        } else {
            updatedPins = [...pinnedThreads, threadId];
        }

        setPinnedThreads(updatedPins);

        localStorage.setItem(
            pinStorageKey,
            JSON.stringify(updatedPins)
        );
    };


    // Logout using Passport
    const handleLogout = async () => {
        if (loggingOut) return;

        setLoggingOut(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            if (!response.ok) {
                const data = await response.json();

                throw new Error(
                    data.error || "Logout failed"
                );
            }

            // Clear private application data
            setIsProfileOpen(false);
            clearPrivateData();

        } catch (error) {
            console.error("Logout error:", error);
            window.alert(error.message);
        } finally {
            setLoggingOut(false);
        }
    };


    // Search chats
    const filteredThreads = allThreads.filter((thread) =>
        thread.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinnedChats = filteredThreads.filter((thread) =>
        pinnedThreads.includes(thread.threadId)
    );

    const recentChats = filteredThreads.filter(
        (thread) => !pinnedThreads.includes(thread.threadId)
    );


    // Dynamic user information
    const userName = user?.name || "Guest";
    const userEmail = user?.email || "Log in to save your chats";
    const userInitials = getInitials(userName);


    return (
        <section className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>

            {/* Sidebar header */}
            <div className="sidebarHeader">

                <div className="sidebarBrand">
                    <i
                        className="fa-solid fa-comments logo"
                        aria-label="PromptFlow logo"
                        role="img"
                        style={{ color: "#22C55E" }}
                    ></i>
                    <span>PromptFlow</span>
                </div>

                <div className="sidebarHeaderActions">

                    <button
                        className="sidebarIconButton"
                        title="Search chats"
                        onClick={() => {
                            setIsCollapsed(false);

                            document.querySelector(
                                ".sidebarSearch input"
                            )?.focus();
                        }}
                    >
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </button>

                    <button
                        className="sidebarIconButton"
                        title="Toggle sidebar"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <i className="fa-solid fa-table-columns"></i>
                    </button>

                </div>
            </div>


            {/* New chat */}
            <button
                className="newChatButton"
                onClick={createNewChat}
            >
                <i className="fa-solid fa-pen-to-square"></i>
                <span>New chat</span>
            </button>


            {/* Search */}
            <div className="sidebarSearch">

                <i className="fa-solid fa-magnifying-glass"></i>

                <input
                    type="text"
                    placeholder="Search chats"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

            </div>


            {/* Chat history */}
            <div className="sidebarHistory">

                {/* Pinned chats */}
                {user && pinnedChats.length > 0 && (
                    <div className="historySection">

                        <h4>
                            <i className="fa-solid fa-thumbtack"></i>
                            <span>Pinned</span>
                        </h4>

                        <ul className="history">

                            {pinnedChats.map((thread) => (
                                <li
                                    key={thread.threadId}
                                    onClick={() =>
                                        changeThread(thread.threadId)
                                    }
                                    className={
                                        thread.threadId === currThreadId
                                            ? "highlighted"
                                            : ""
                                    }
                                >
                                    <span className="threadTitle">
                                        {thread.title}
                                    </span>

                                    <div className="threadActions">

                                        <button
                                            title="Unpin chat"
                                            onClick={(e) =>
                                                togglePin(e, thread.threadId)
                                            }
                                        >
                                            <i className="fa-solid fa-thumbtack"></i>
                                        </button>

                                        <button
                                            title="Delete chat"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteThread(thread.threadId);
                                            }}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>

                                    </div>
                                </li>
                            ))}

                        </ul>
                    </div>
                )}


                {/* Recent chats */}
                <div className="historySection">

                    <h4>
                        <i className="fa-regular fa-message"></i>
                        <span>Recent</span>
                    </h4>

                    <ul className="history">

                        {user && recentChats.map((thread) => (
                            <li
                                key={thread.threadId}
                                onClick={() =>
                                    changeThread(thread.threadId)
                                }
                                className={
                                    thread.threadId === currThreadId
                                        ? "highlighted"
                                        : ""
                                }
                            >
                                <span className="threadTitle">
                                    {thread.title}
                                </span>

                                <div className="threadActions">

                                    <button
                                        title="Pin chat"
                                        onClick={(e) =>
                                            togglePin(e, thread.threadId)
                                        }
                                    >
                                        <i className="fa-solid fa-thumbtack"></i>
                                    </button>

                                    <button
                                        title="Delete chat"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteThread(thread.threadId);
                                        }}
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>

                                </div>
                            </li>
                        ))}

                    </ul>

                    {user && filteredThreads.length === 0 && (
                        <p className="emptyHistory">
                            {searchQuery
                                ? "No chats found"
                                : "No conversations yet"}
                        </p>
                    )}

                </div>
            </div>


            {/* Profile menu */}
            <div className="sidebarProfile">

                {isProfileOpen && (
                    <div className="profileMenu">

                        {/* Profile information */}
                        <div className="profileMenuHeader">

                            <div className="profileAvatar">

                                {user?.profilePicture ? (
                                    <img
                                        src={user.profilePicture}
                                        alt={userName}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            borderRadius: "50%"
                                        }}
                                    />
                                ) : (
                                    userInitials
                                )}

                            </div>

                            <div
                                className="profileUserInfo"
                                title={userEmail}
                            >
                                <strong>{userName}</strong>
                                <span>{userEmail}</span>
                            </div>


                        </div>


                        <div className="profileDivider"></div>


                        {/* Guest menu */}
                        {!user && (
                            <>
                                <button
                                    className="profileMenuItem"
                                    onClick={() => openAuth("login")}
                                >
                                    <i className="fa-solid fa-right-to-bracket"></i>
                                    <span>Log in</span>
                                </button>

                                <button
                                    className="profileMenuItem"
                                    onClick={() => openAuth("signup")}
                                >
                                    <i className="fa-solid fa-user-plus"></i>
                                    <span>Sign up for free</span>
                                </button>
                            </>
                        )}


                        {/* Authenticated user menu */}
                        {user && (
                            <>
                                <button
                                    className="profileMenuItem"
                                    onClick={() => openView("upgrade")}
                                >
                                    <i className="fa-solid fa-crown"></i>
                                    <span>Upgrade plan</span>
                                </button>

                                <button
                                    className="profileMenuItem"
                                    onClick={() => openView("profile")}
                                >
                                    <i className="fa-regular fa-user"></i>
                                    <span>Profile</span>
                                </button>
                            </>
                        )}


                        <div className="profileDivider"></div>


                        {/* Theme toggle */}
                        <button
                            className="profileMenuItem"
                            onClick={toggleTheme}
                        >
                            <i
                                className={`fa-solid ${
                                    theme === "dark" ? "fa-sun" : "fa-moon"
                                }`}
                            ></i>

                            <span>
                                Switch to {theme === "dark" ? "Light" : "Dark"} theme
                            </span>
                        </button>


                        {/* Settings */}
                        <button
                            className="profileMenuItem"
                            onClick={() => openView("settings")}
                        >
                            <i className="fa-solid fa-gear"></i>
                            <span>Settings</span>
                        </button>


                        {/* Help */}
                        <button
                            className="profileMenuItem"
                            onClick={() => openView("help")}
                        >
                            <i className="fa-regular fa-life-ring"></i>
                            <span>Help</span>
                        </button>


                        <div className="profileDivider"></div>


                        {/* Logout for logged-in users */}
                        {user && (
                            <button
                                className="profileMenuItem"
                                onClick={handleLogout}
                                disabled={loggingOut}
                            >
                                <i className="fa-solid fa-arrow-right-from-bracket"></i>

                                <span>
                                    {loggingOut
                                        ? "Logging out..."
                                        : "Log out"}
                                </span>
                            </button>
                        )}

                    </div>
                )}


                {/* Bottom profile button */}
                <button
                    className="profileButton"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                >

                    <div className="profileAvatar">

                        {user?.profilePicture ? (
                            <img
                                src={user.profilePicture}
                                alt={userName}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "50%"
                                }}
                            />
                        ) : (
                            userInitials
                        )}

                    </div>

                    <div
                        className="profileUserInfo"
                        title={userEmail}
                    >
                        <strong>{userName}</strong>
                        <span>{userEmail}</span>
                    </div>

                    <i className="fa-solid fa-chevron-right profileArrow"></i>

                </button>

            </div>

        </section>
    );
}

export default Sidebar;
