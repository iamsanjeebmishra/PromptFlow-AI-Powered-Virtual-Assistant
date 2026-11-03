
import "./Chat.css";
import React, {
    useContext,
    useState,
    useEffect,
    useRef
} from "react";

import { MyContext } from "./MyContext.jsx";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";


function getTextFromNode(node) {
    if (typeof node === "string" || typeof node === "number") {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(getTextFromNode).join("");
    }

    if (React.isValidElement(node)) {
        return getTextFromNode(node.props.children);
    }

    return "";
}


function Chat({ onRegenerate, loading }) {
    const {
        newChat,
        prevChats,
        reply,
        setPrompt
    } = useContext(MyContext);

    const [latestReply, setLatestReply] = useState(null);
    const [copiedItem, setCopiedItem] = useState(null);

    const chatContainerRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);
    const previousChatsRef = useRef(prevChats);
    const copiedTimeoutRef = useRef(null);


    // Animate the latest assistant response word by word
    useEffect(() => {
        if (!reply) {
            setLatestReply(null);
            return;
        }

        if (!prevChats?.length) return;

        const words = reply.split(" ");
        let index = 0;

        setLatestReply("");

        const interval = setInterval(() => {
            setLatestReply(words.slice(0, index + 1).join(" "));
            index++;

            if (index >= words.length) {
                clearInterval(interval);
            }
        }, 40);

        return () => clearInterval(interval);
    }, [prevChats, reply]);


    // Auto-scroll for new user messages and while at the bottom
    useEffect(() => {
        const container = chatContainerRef.current;

        if (!container) {
            previousChatsRef.current = prevChats;
            return;
        }

        const chatsChanged = previousChatsRef.current !== prevChats;

        if (chatsChanged) {
            const lastChat = prevChats?.[prevChats.length - 1];

            // Always jump to a newly submitted user message
            if (lastChat?.role === "user") {
                shouldAutoScrollRef.current = true;
            }

            previousChatsRef.current = prevChats;
        }

        if (shouldAutoScrollRef.current) {
            container.scrollTop = container.scrollHeight;
        }
    }, [prevChats, latestReply]);


    // Detect manual scrolling
    const handleChatScroll = () => {
        const container = chatContainerRef.current;

        if (!container) return;

        const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;

        shouldAutoScrollRef.current = distanceFromBottom < 100;
    };


    // Clear copied confirmation timer
    useEffect(() => {
        return () => clearTimeout(copiedTimeoutRef.current);
    }, []);


    // Copy text
    const handleCopy = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);

            setCopiedItem(id);

            clearTimeout(copiedTimeoutRef.current);

            copiedTimeoutRef.current = setTimeout(() => {
                setCopiedItem(null);
            }, 1600);

        } catch (error) {
            console.error("Copy failed:", error);
        }
    };


    // Share text (used for user messages and code snippets)
    const handleShare = async (text, id) => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Shared from PromptFlow",
                    text
                });
            } else {
                await handleCopy(text, id);
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Share failed:", error);
            }
        }
    };


    // Suggestion actions
    const handleSuggestion = (suggestion) => {
        setPrompt(suggestion);
    };


    return (
        <div className="chatContent">

            {/* WELCOME SCREEN */}
            {newChat && prevChats.length === 0 ? (

                <div className="welcomeScreen">

                    <h1>What's on the agenda today?</h1>

                    <p className="welcomeSubtitle">
                        Ask anything, explore ideas, or build something new.
                    </p>

                    <div className="suggestionCards">

                        <button
                            className="suggestionCard"
                            onClick={() =>
                                handleSuggestion("Explain a difficult concept to me")
                            }
                        >
                            <i className="fa-regular fa-lightbulb"></i>
                            <span>Explain something</span>
                        </button>

                        <button
                            className="suggestionCard"
                            onClick={() =>
                                handleSuggestion("Help me write some code")
                            }
                        >
                            <i className="fa-solid fa-code"></i>
                            <span>Write code</span>
                        </button>

                        <button
                            className="suggestionCard"
                            onClick={() =>
                                handleSuggestion("Help me debug my code")
                            }
                        >
                            <i className="fa-solid fa-bug"></i>
                            <span>Debug code</span>
                        </button>

                        <button
                            className="suggestionCard"
                            onClick={() =>
                                handleSuggestion("Give me some creative ideas")
                            }
                        >
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            <span>Explore ideas</span>
                        </button>

                    </div>
                </div>

            ) : (

                /* CONVERSATION SCREEN */
                <div
                    className="chats"
                    ref={chatContainerRef}
                    onScroll={handleChatScroll}
                >

                    {prevChats?.map((chat, idx) => {

                        const isLatestAssistant =
                            chat.role === "assistant" &&
                            idx === prevChats.length - 1 &&
                            reply !== null;

                        const messageContent =
                            isLatestAssistant && latestReply !== null
                                ? latestReply
                                : chat.content;

                        const messageId = `message-${idx}`;
                        let codeIndex = 0;

                        // Hide actions while the latest response is animating
                        const responseIsReady =
                            !isLatestAssistant ||
                            latestReply === chat.content;

                        return (
                            <div
                                className={
                                    chat.role === "user"
                                        ? "userDiv"
                                        : "gptDiv"
                                }
                                key={idx}
                            >

                                {/* USER MESSAGE */}
                                {chat.role === "user" ? (

                                    <div className="userMessageContainer">

                                        <p className="userMessage">
                                            {chat.content}
                                        </p>

                                        <div className="messageActions">

                                            <button
                                                className="messageActionButton"
                                                type="button"
                                                title="Copy message"
                                                onClick={() =>
                                                    handleCopy(chat.content, messageId)
                                                }
                                            >
                                                <i
                                                    className={`fa-regular ${
                                                        copiedItem === messageId
                                                            ? "fa-circle-check"
                                                            : "fa-copy"
                                                    }`}
                                                ></i>

                                                <span>
                                                    {copiedItem === messageId
                                                        ? "Copied!"
                                                        : "Copy"}
                                                </span>
                                            </button>

                                            <button
                                                className="messageActionButton"
                                                type="button"
                                                title="Share message"
                                                onClick={() =>
                                                    handleShare(
                                                        chat.content,
                                                        `share-${messageId}`
                                                    )
                                                }
                                            >
                                                <i className="fa-solid fa-share-nodes"></i>
                                                <span>Share</span>
                                            </button>

                                        </div>
                                    </div>

                                ) : (

                                    /* ASSISTANT RESPONSE */
                                    <div className="gptMessageContainer">

                                        <div className="gptMessage">

                                            <ReactMarkdown
                                                rehypePlugins={[rehypeHighlight]}
                                                components={{

                                                    // Custom code editor
                                                    pre: ({ children }) => {
                                                        const code =
                                                            getTextFromNode(children);

                                                        const codeElement =
                                                            React.Children.toArray(children)
                                                                .find((child) =>
                                                                    React.isValidElement(child)
                                                                );

                                                        const codeClass =
                                                            codeElement?.props?.className || "";

                                                        const language =
                                                            codeClass.match(
                                                                /language-([\w-]+)/
                                                            )?.[1] || "Code";

                                                        const codeId =
                                                            `code-${idx}-${codeIndex++}`;

                                                        return (
                                                            <div className="codeEditor">

                                                                {/* EDITOR HEADER */}
                                                                <div className="codeEditorHeader">

                                                                    <div className="codeEditorLanguage">
                                                                        <i className="fa-solid fa-code"></i>
                                                                        <span>
                                                                            {language.toUpperCase()}
                                                                        </span>
                                                                    </div>

                                                                    <div className="codeEditorActions">

                                                                        <button
                                                                            type="button"
                                                                            title="Share code"
                                                                            onClick={() =>
                                                                                handleShare(
                                                                                    code,
                                                                                    `share-${codeId}`
                                                                                )
                                                                            }
                                                                        >
                                                                            <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            title="Copy code"
                                                                            onClick={() =>
                                                                                handleCopy(code, codeId)
                                                                            }
                                                                        >
                                                                            <i
                                                                                className={`fa-regular ${
                                                                                    copiedItem === codeId
                                                                                        ? "fa-circle-check"
                                                                                        : "fa-copy"
                                                                                }`}
                                                                            ></i>
                                                                        </button>

                                                                    </div>
                                                                </div>

                                                                {/* CODE CONTENT */}
                                                                <div className="codeEditorContent">
                                                                    <pre>{children}</pre>
                                                                </div>

                                                            </div>
                                                        );
                                                    }
                                                }}
                                            >
                                                {messageContent}
                                            </ReactMarkdown>

                                        </div>


                                        {/* ASSISTANT MESSAGE ACTIONS */}
                                        {responseIsReady && (
                                            <div className="messageActions">

                                                {/* Copy assistant response */}
                                                <button
                                                    className="messageActionButton"
                                                    type="button"
                                                    title="Copy response"
                                                    onClick={() =>
                                                        handleCopy(
                                                            chat.content,
                                                            messageId
                                                        )
                                                    }
                                                >
                                                    <i
                                                        className={`fa-regular ${
                                                            copiedItem === messageId
                                                                ? "fa-circle-check"
                                                                : "fa-copy"
                                                        }`}
                                                    ></i>

                                                    <span>
                                                        {copiedItem === messageId
                                                            ? "Copied!"
                                                            : "Copy"}
                                                    </span>
                                                </button>


                                                {/* Regenerate only the latest response */}
                                                {idx === prevChats.length - 1 && (
                                                    <button
                                                        className="messageActionButton"
                                                        type="button"
                                                        title="Regenerate response"
                                                        onClick={onRegenerate}
                                                        disabled={loading}
                                                    >
                                                        <i className="fa-solid fa-rotate-right"></i>
                                                        <span>Regenerate</span>
                                                    </button>
                                                )}

                                            </div>
                                        )}

                                    </div>
                                )}

                            </div>
                        );
                    })}

                </div>
            )}

        </div>
    );
}

export default Chat;
