
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

const API_BASE_URL = "http://localhost:8080/api";

function ChatWindow() {
    const {
        prompt,
        setPrompt,
        reply,
        setReply,
        currThreadId,
        prevChats,
        setPrevChats,
        setNewChat,
        setAllThreads
    } = useContext(MyContext);

    const [loading, setLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const [isExpanded, setIsExpanded] = useState(false);
    const [showExpandButton, setShowExpandButton] = useState(false);

    const textareaRef = useRef(null);

    // Prevent regeneration from appending a duplicate assistant message
    const handledReplyRef = useRef(null);


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
                `${API_BASE_URL}/chat`,
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


    // Append a new assistant response only once
    useEffect(() => {
        if (!reply) {
            handledReplyRef.current = null;
            return;
        }

        // Regenerated responses are already replaced in prevChats
        if (handledReplyRef.current === reply) {
            return;
        }

        handledReplyRef.current = reply;

        setPrevChats((previousChats) => [
            ...previousChats,
            {
                role: "assistant",
                content: reply
            }
        ]);
    }, [reply, setPrevChats]);


    // Regenerate the latest assistant response
    const handleRegenerate = async () => {
        if (loading || !currThreadId || !prevChats?.length) return;

        const lastMessage = prevChats[prevChats.length - 1];

        if (lastMessage?.role !== "assistant") return;

        setLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/chat/${encodeURIComponent(currThreadId)}/regenerate`,
                {
                    method: "POST"
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to regenerate response"
                );
            }

            const data = await response.json();

            // Mark the response as already handled by this component
            handledReplyRef.current = data.reply;

            // Replace the latest assistant response in React state
            setPrevChats((previousChats) => {
                const updatedChats = [...previousChats];
                const lastIndex = updatedChats.length - 1;

                if (updatedChats[lastIndex]?.role === "assistant") {
                    updatedChats[lastIndex] = {
                        ...updatedChats[lastIndex],
                        content: data.reply
                    };
                }

                return updatedChats;
            });

            // Chat.jsx uses reply changes to animate the latest response
            setReply(data.reply);

        } catch (error) {
            console.error("Regenerate error:", error);
            window.alert(error.message);
        } finally {
            setLoading(false);
        }
    };


    // Share the complete conversation
    const handleShareConversation = async () => {
        if (
            isSharing ||
            loading ||
            !currThreadId ||
            !prevChats?.length
        ) {
            return;
        }

        setIsSharing(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/thread/${encodeURIComponent(currThreadId)}/share`,
                {
                    method: "POST"
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to create share link"
                );
            }

            const data = await response.json();

            if (!data.shareId) {
                throw new Error("Share link was not returned by the server");
            }

            const shareUrl =
                `${window.location.origin}/share/${data.shareId}`;

            // Use the native sharing menu when available
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "PromptFlow conversation",
                        text: "Check out this conversation on PromptFlow.",
                        url: shareUrl
                    });

                    return;
                } catch (shareError) {
                    // Closing the native share menu is not an error
                    if (shareError.name === "AbortError") {
                        return;
                    }
                }
            }

            // Fallback: copy the link
            await navigator.clipboard.writeText(shareUrl);

            window.alert("Share link copied to clipboard.");

        } catch (error) {
            console.error("Share error:", error);
            window.alert(error.message);
        } finally {
            setIsSharing(false);
        }
    };


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

                {/* Share complete conversation */}
                <button
                    type="button"
                    className="messageActionButton"
                    style={{ marginLeft: "auto" }}
                    onClick={handleShareConversation}
                    disabled={!prevChats?.length || loading || isSharing}
                    title="Share conversation"
                    aria-label="Share conversation"
                >
                    <i className="fa-solid fa-share-nodes"></i>
                    <span>{isSharing ? "Sharing..." : "Share"}</span>
                </button>

            </div>


            {/* Main conversation area */}
            <div className="chatMain">
                <Chat
                    onRegenerate={handleRegenerate}
                    loading={loading}
                />
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

                    {/* Expand / Compress button */}
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
