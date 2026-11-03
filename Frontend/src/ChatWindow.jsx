
import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import {
    useContext,
    useState,
    useEffect,
    useLayoutEffect,
    useRef
} from "react";
import { ScaleLoader } from "react-spinners";

function ChatWindow() {
    const {
        prompt,
        setPrompt,
        reply,
        setReply,
        currThreadId,
        setPrevChats,
        setNewChat,
        setAllThreads
    } = useContext(MyContext);

    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showExpandButton, setShowExpandButton] = useState(false);

    const textareaRef = useRef(null);

    // Automatically resize the textarea
    const resizeTextarea = () => {
        const textarea = textareaRef.current;

        if (!textarea) return;

        if (isExpanded) {
            textarea.style.height = "100%";
            textarea.style.overflowY = "auto";
            return;
        }

        const minHeight = 38;
        const maxHeight = 180;

        textarea.style.height = "auto";

        const contentHeight = textarea.scrollHeight;

        const newHeight = Math.min(
            Math.max(contentHeight, minHeight),
            maxHeight
        );

        textarea.style.height = `${newHeight}px`;

        textarea.style.overflowY =
            contentHeight > maxHeight ? "auto" : "hidden";

        // Show expand button only when content exceeds normal height
        setShowExpandButton(contentHeight > minHeight + 8);
    };

    useLayoutEffect(() => {
        resizeTextarea();
    }, [prompt, isExpanded]);

    // Handle typing and pasting
    const handlePromptChange = (e) => {
        setPrompt(e.target.value);
    };

    // Toggle composer expansion
    const toggleExpansion = () => {
        setIsExpanded((previous) => !previous);
    };

    // Send prompt to backend
    const getReply = async () => {
        const currentPrompt = prompt.trim();

        if (!currentPrompt || loading) return;

        setLoading(true);
        setNewChat(false);
        setPrompt("");
        setReply(null);

        // Display user message immediately
        setPrevChats((previousChats) => [
            ...previousChats,
            {
                role: "user",
                content: currentPrompt
            }
        ]);

        try {
            const response = await fetch(
                "http://localhost:8080/api/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: currentPrompt,
                        threadId: currThreadId
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to get response from server");
            }

            const data = await response.json();

            setReply(data.reply);

            // Update sidebar immediately
            setAllThreads((previousThreads) => {
                const existingThread = previousThreads.find(
                    (thread) => thread.threadId === currThreadId
                );

                const updatedThread = {
                    threadId: currThreadId,
                    title:
                        data.title ||
                        existingThread?.title ||
                        currentPrompt
                };

                return [
                    updatedThread,
                    ...previousThreads.filter(
                        (thread) => thread.threadId !== currThreadId
                    )
                ];
            });

        } catch (error) {
            console.error("Error getting reply:", error);
        } finally {
            setLoading(false);
        }
    };

    // Add assistant response to conversation
    useEffect(() => {
        if (reply) {
            setPrevChats((previousChats) => [
                ...previousChats,
                {
                    role: "assistant",
                    content: reply
                }
            ]);
        }
    }, [reply, setPrevChats]);

    // Enter sends; Shift + Enter inserts a new line
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            getReply();
        }

        if (e.key === "Escape" && isExpanded) {
            setIsExpanded(false);
        }
    };

    return (
        <div className="chatwindow">

            {/* Top navigation */}
            <div className="navbar">
                <div className="modelName">
                    <span>PromptFlow</span>
                    <i className="fa-solid fa-chevron-down"></i>
                </div>
            </div>

            {/* Main conversation area */}
            <div className="chatMain">
                <Chat />
            </div>

            {/* Loading animation */}
            <div className="loadingArea">
                <ScaleLoader
                    color="#ececec"
                    loading={loading}
                    height={20}
                    width={3}
                    radius={2}
                />
            </div>

            {/* Prompt composer */}
            <div className="chatInput">

                <form
                    className={`inputBox ${isExpanded ? "expanded" : ""}`}
                    onSubmit={(e) => {
                        e.preventDefault();
                        getReply();
                    }}
                >

                    {/* Expand / Compress button - only when needed */}
                    {showExpandButton && (
                        <button
                            type="button"
                            className="expandComposerButton"
                            onClick={toggleExpansion}
                            title={
                                isExpanded
                                    ? "Compress composer"
                                    : "Expand composer"
                            }
                            aria-label={
                                isExpanded
                                    ? "Compress composer"
                                    : "Expand composer"
                            }
                        >
                            <i
                                className={
                                    isExpanded
                                        ? "fa-solid fa-down-left-and-up-right-to-center"
                                        : "fa-solid fa-up-right-and-down-left-from-center"
                                }
                            ></i>
                        </button>
                    )}

                    {/* Prompt textarea */}
                    <textarea
                        ref={textareaRef}
                        className="promptTextarea"
                        placeholder="Ask PromptFlow..."
                        value={prompt}
                        onChange={handlePromptChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={loading}
                    />

                    {/* Bottom action row */}
                    <div className="composerActions">

                        <button
                            type="button"
                            className="plusIcon"
                            title="Add attachment"
                        >
                            <i className="fa-solid fa-plus"></i>
                        </button>

                        <div className="composerRightActions">

                            <button
                                type="button"
                                className="thinkLabel"
                                title="Think"
                            >
                                <i className="fa-solid fa-brain"></i>
                                <span>Think</span>
                            </button>

                            <button
                                type="button"
                                className="voiceIcon"
                                title="Voice input"
                            >
                                <i className="fa-solid fa-microphone"></i>
                            </button>

                            <button
                                type="submit"
                                className="sendButton"
                                disabled={!prompt.trim() || loading}
                                title="Send message"
                            >
                                <i className="fa-solid fa-arrow-up"></i>
                            </button>

                        </div>
                    </div>

                </form>

                <p className="info">
                    PromptFlow can make mistakes. Check important info.
                </p>

            </div>
        </div>
    );
}

export default ChatWindow;
