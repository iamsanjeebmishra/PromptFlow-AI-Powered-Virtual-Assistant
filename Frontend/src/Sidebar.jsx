
import "./Sidebar.css";
import { useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import logo from "./assets/blacklogo.png";

function Sidebar() {
    const {
        allThreads,
        setAllThreads,
        currThreadId,
        setNewChat,
        setPrompt,
        setReply,
        setCurrThreadId,
        setPrevChats
    } = useContext(MyContext);

    const [searchQuery, setSearchQuery] = useState("");
    const [pinnedThreads, setPinnedThreads] = useState([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Load pinned chats from browser storage
    useEffect(() => {
        const savedPins = JSON.parse(
            localStorage.getItem("promptflow-pinned-chats") || "[]"
        );
        setPinnedThreads(savedPins);
    }, []);

    // Fetch all existing chats
    const getAllThreads = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/thread");
            const res = await response.json();

            const filterData = res.map((thread) => ({
                threadId: thread.threadId,
                title: thread.title
            }));

            setAllThreads(filterData);
        } catch (error) {
            console.log("Error fetching threads:", error);
        }
    };

    useEffect(() => {
        getAllThreads();
    }, []);

    // Create a new chat
    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
        setIsProfileOpen(false);
    };

    // Open an existing chat
    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);

        try {
            const response = await fetch(
                `http://localhost:8080/api/thread/${newThreadId}`
            );

            const res = await response.json();

            setPrevChats(res);
            setNewChat(false);
            setReply(null);
        } catch (error) {
            console.log("Error loading thread:", error);
        }
    };

    // Delete a chat
    const deleteThread = async (threadId) => {
        try {
            const response = await fetch(
                `http://localhost:8080/api/thread/${threadId}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                throw new Error("Unable to delete chat");
            }

            setAllThreads((prev) =>
                prev.filter((thread) => thread.threadId !== threadId)
            );

            // Also remove it from pinned chats
            const updatedPins = pinnedThreads.filter(
                (id) => id !== threadId
            );

            setPinnedThreads(updatedPins);
            localStorage.setItem(
                "promptflow-pinned-chats",
                JSON.stringify(updatedPins)
            );

            if (threadId === currThreadId) {
                createNewChat();
            }
        } catch (error) {
            console.log("Error deleting thread:", error);
        }
    };

    // Pin or unpin a chat
    const togglePin = (e, threadId) => {
        e.stopPropagation();

        let updatedPins;

        if (pinnedThreads.includes(threadId)) {
            updatedPins = pinnedThreads.filter((id) => id !== threadId);
        } else {
            updatedPins = [...pinnedThreads, threadId];
        }

        setPinnedThreads(updatedPins);

        localStorage.setItem(
            "promptflow-pinned-chats",
            JSON.stringify(updatedPins)
        );
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

    return (
        <section className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>

            {/* Sidebar header */}
            <div className="sidebarHeader">
                <div className="sidebarBrand">
                    <img src={logo} alt="PromptFlow" className="logo" />
                    <span>PromptFlow</span>
                </div>

                <div className="sidebarHeaderActions">
                    <button
                        className="sidebarIconButton"
                        title="Search chats"
                        onClick={() => {
                            setIsCollapsed(false);
                            document.querySelector(".sidebarSearch input")?.focus();
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
            <button className="newChatButton" onClick={createNewChat}>
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
                {pinnedChats.length > 0 && (
                    <div className="historySection">
                        <h4>
                            <i className="fa-solid fa-thumbtack"></i>
                            <span>Pinned</span>
                        </h4>

                        <ul className="history">
                            {pinnedChats.map((thread) => (
                                <li
                                    key={thread.threadId}
                                    onClick={() => changeThread(thread.threadId)}
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
                        {recentChats.map((thread) => (
                            <li
                                key={thread.threadId}
                                onClick={() => changeThread(thread.threadId)}
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

                    {filteredThreads.length === 0 && (
                        <p className="emptyHistory">
                            {searchQuery ? "No chats found" : "No conversations yet"}
                        </p>
                    )}
                </div>
            </div>

            {/* Profile menu */}
            <div className="sidebarProfile">

                {isProfileOpen && (
                    <div className="profileMenu">

                        <div className="profileMenuHeader">
                            <div className="profileAvatar">SM</div>

                            <div className="profileUserInfo">
                                <strong>Sanjeeb Kumar Mishra</strong>
                                <span>Go</span>
                            </div>

                            <i className="fa-solid fa-chevron-right"></i>
                        </div>

                        <div className="profileDivider"></div>

                        <button className="profileMenuItem">
                            <i className="fa-solid fa-sparkles"></i>
                            <span>Upgrade plan</span>
                        </button>

                        <button className="profileMenuItem">
                            <i className="fa-solid fa-sliders"></i>
                            <span>Personalization</span>
                        </button>

                        <button className="profileMenuItem">
                            <i className="fa-regular fa-user"></i>
                            <span>Profile</span>
                        </button>

                        <button className="profileMenuItem">
                            <i className="fa-solid fa-gear"></i>
                            <span>Settings</span>
                        </button>

                        <div className="profileDivider"></div>

                        <button className="profileMenuItem">
                            <i className="fa-regular fa-life-ring"></i>
                            <span>Help</span>
                            <i className="fa-solid fa-chevron-right menuArrow"></i>
                        </button>

                        <button
                            className="profileMenuItem"
                            onClick={() => setIsProfileOpen(false)}
                        >
                            <i className="fa-solid fa-arrow-right-from-bracket"></i>
                            <span>Log out</span>
                        </button>
                    </div>
                )}

                <button
                    className="profileButton"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                    <div className="profileAvatar">SM</div>

                    <div className="profileUserInfo">
                        <strong>Sanjeeb Kumar Mishra</strong>
                        <span>Go</span>
                    </div>

                    <i className="fa-solid fa-chevron-right profileArrow"></i>
                </button>
            </div>
        </section>
    );
}

export default Sidebar;
