
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

import "./SharePage.css";
import "highlight.js/styles/github-dark.css";

const API_BASE_URL = "http://localhost:8080/api";

function SharePage({ shareId: suppliedShareId }) {

    const pathParts = window.location.pathname
        .split("/")
        .filter(Boolean);

    const shareId =
        suppliedShareId ||
        (pathParts[0] === "share" ? pathParts[1] : null);

    const [conversation, setConversation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {
        const fetchSharedConversation = async () => {
            if (!shareId) {
                setError("Invalid sharing link.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/share/${encodeURIComponent(shareId)}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Unable to load shared conversation."
                    );
                }

                setConversation(data);

            } catch (error) {
                console.error("Shared conversation error:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedConversation();
    }, [shareId]);


    if (loading) {
        return (
            <div className="sharedPage">
                <div className="sharedStatus">
                    <div className="sharedSpinner"></div>
                    <p>Loading shared conversation...</p>
                </div>
            </div>
        );
    }


    if (error) {
        return (
            <div className="sharedPage">
                <div className="sharedStatus">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <h2>Conversation unavailable</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }


    return (
        <div className="sharedPage">

            <header className="sharedNavbar">

                <div className="sharedBrand">
                    <i className="fa-solid fa-comments"></i>
                    <span>PromptFlow</span>
                </div>

                <span className="sharedLabel">
                    Shared conversation
                </span>

            </header>


            <main className="sharedMain">

                <div className="sharedConversationHeader">

                    <h1>
                        {conversation.title || "Shared conversation"}
                    </h1>

                    <p>
                        Read-only conversation shared from PromptFlow
                    </p>

                </div>


                <div className="sharedMessages">

                    {conversation.messages.map((message, index) => (

                        <div
                            className={
                                message.role === "user"
                                    ? "sharedUserMessage"
                                    : "sharedAssistantMessage"
                            }
                            key={index}
                        >

                            <div className="sharedRole">
                                {message.role === "user"
                                    ? "You"
                                    : "PromptFlow"}
                            </div>

                            <div className="sharedMessageContent">

                                {message.role === "assistant" ? (
                                    <ReactMarkdown
                                        rehypePlugins={[rehypeHighlight]}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                ) : (
                                    <p>{message.content}</p>
                                )}

                            </div>

                        </div>

                    ))}

                </div>


                <footer className="sharedFooter">
                    Shared using PromptFlow
                </footer>

            </main>

        </div>
    );
}

export default SharePage;
