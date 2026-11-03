
import "./ChatWindow.css";
import "./ShareModal.css";
import "./ImageAttachments.css";

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

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8080/api";

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp"
];

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
        setAllThreads,

        // Authentication context
        user,
        setUser,
        setShowAuth,
        setAuthMode,

        // Chat preferences
        enterToSend = true
    } = useContext(MyContext);

    const [loading, setLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    // Share modal states
    const [shareUrl, setShareUrl] = useState("");
    const [showShareModal, setShowShareModal] = useState(false);
    const [copiedShareLink, setCopiedShareLink] = useState(false);

    const [isExpanded, setIsExpanded] = useState(false);
    const [showExpandButton, setShowExpandButton] = useState(false);

    // Image attachment states
    const [selectedImages, setSelectedImages] = useState([]);

    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // Prevent regeneration from appending duplicate messages
    const handledReplyRef = useRef(null);

    const selectedImagesRef = useRef(selectedImages);
    selectedImagesRef.current = selectedImages;
    const pendingPreviewUrlsRef = useRef(new Set());

    // Clean up image preview URLs when component unmounts
    useEffect(() => {
        return () => {
            selectedImagesRef.current.forEach((image) => {
                if (image.previewUrl) {
                    URL.revokeObjectURL(image.previewUrl);
                }
            });

            pendingPreviewUrlsRef.current.forEach((previewUrl) => {
                URL.revokeObjectURL(previewUrl);
            });

            pendingPreviewUrlsRef.current.clear();
        };
    }, []);

    // Redirect guests to login
    const requireLogin = () => {
        setAuthMode("login");
        setShowAuth(true);
    };

    // Automatically resize textarea
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

    // Handle typing
    const handlePromptChange = (e) => {
        setPrompt(e.target.value);
    };

    // Handle image selection
    const handleImageSelection = (event) => {
        if (!user) {
            requireLogin();
            event.target.value = "";
            return;
        }

        const files = Array.from(event.target.files || []);

        const availableSlots =
            MAX_IMAGES - selectedImages.length;

        if (availableSlots <= 0) {
            window.alert(
                `You can attach up to ${MAX_IMAGES} images per message.`
            );

            event.target.value = "";
            return;
        }

        const accepted = [];

        files.slice(0, availableSlots).forEach((file) => {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                window.alert(
                    `${file.name} is not supported. Choose PNG, JPG, or WEBP.`
                );
                return;
            }

            if (file.size > MAX_IMAGE_SIZE) {
                window.alert(
                    `${file.name} is larger than 3 MB. Please choose a smaller image.`
                );
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            pendingPreviewUrlsRef.current.add(previewUrl);

            accepted.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                name: file.name,
                mimeType: file.type,
                previewUrl
            });
        });

        if (files.length > availableSlots) {
            window.alert(
                `Only ${availableSlots} more image(s) can be attached.`
            );
        }

        if (accepted.length > 0) {
            setSelectedImages((previous) => [
                ...previous,
                ...accepted
            ]);
        }

        // Allows selecting the same file again
        event.target.value = "";
    };

    // Remove selected image
    const removeSelectedImage = (imageId) => {
        setSelectedImages((previous) => {
            const imageToRemove = previous.find(
                (image) => image.id === imageId
            );

            if (imageToRemove?.previewUrl) {
                URL.revokeObjectURL(imageToRemove.previewUrl);
                pendingPreviewUrlsRef.current.delete(
                    imageToRemove.previewUrl
                );
            }

            return previous.filter(
                (image) => image.id !== imageId
            );
        });
    };

    // Convert image file to Base64 data URL
    const fileToDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);

            reader.onerror = () =>
                reject(new Error(`Could not read ${file.name}`));

            reader.readAsDataURL(file);
        });

    // Toggle composer expansion
    const toggleExpansion = () => {
        setIsExpanded((previous) => !previous);
    };

    // Send text, images, or both
    // Reset the composer immediately; keep the selected files in this
    // function until the request succeeds or fails.
    const getReply = async () => {
        const currentPrompt = prompt.trim();
        const imagesToSend = [...selectedImages];

        if (
            (!currentPrompt && imagesToSend.length === 0) ||
            loading
        ) {
            return;
        }

        // Guest must log in before sending
        if (!user) {
            requireLogin();
            return;
        }

        const messageForAI =
            currentPrompt ||
            "Please analyze the attached image(s).";

        const optimisticMessageId = `pending-${Date.now()}`;

        // Immediately return the composer to its empty state.
        setLoading(true);
        setNewChat(false);
        setPrompt("");
        setSelectedImages([]);
        setReply(null);

        // Show the message and its local image previews immediately.
        // Chat.jsx supports image.url as well as image.dataUrl.
        setPrevChats((previousChats) => [
            ...previousChats,
            {
                id: optimisticMessageId,
                role: "user",
                content: messageForAI,
                images: imagesToSend.map((image) => ({
                    name: image.name,
                    mimeType: image.mimeType,
                    url: image.previewUrl
                }))
            }
        ]);

        try {
            // Convert selected images into Base64 for the backend.
            const imagePayload = await Promise.all(
                imagesToSend.map(async (image) => ({
                    name: image.name,
                    mimeType: image.mimeType,
                    dataUrl: await fileToDataUrl(image.file)
                }))
            );

            // Replace temporary object URLs with data URLs in the
            // optimistic message before releasing the object URLs.
            setPrevChats((previousChats) =>
                previousChats.map((chat) =>
                    chat.id === optimisticMessageId
                        ? { ...chat, images: imagePayload }
                        : chat
                )
            );

            // Send request to backend
            const response = await fetch(
                `${API_BASE_URL}/chat`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: messageForAI,
                        threadId: currThreadId,
                        images: imagePayload
                    })
                }
            );

            if (response.status === 401) {
                setUser(null);
                requireLogin();

                throw new Error(
                    "Your session expired. Please log in again."
                );
            }

            if (!response.ok) {
                const errorData = await response.json().catch(
                    () => ({})
                );

                throw new Error(
                    errorData.error ||
                    "Failed to get response from server"
                );
            }

            const data = await response.json();

            // The message is now stored by the backend. The temporary
            // object URLs are no longer needed because Chat.jsx is using
            // the Base64 data URLs for this optimistic message.
            imagesToSend.forEach((image) => {
                if (image.previewUrl) {
                    URL.revokeObjectURL(image.previewUrl);
                    pendingPreviewUrlsRef.current.delete(
                        image.previewUrl
                    );
                }
            });

            setReply(data.reply);

            // Update sidebar immediately
            setAllThreads((previousThreads) => {
                const existingThread = previousThreads.find(
                    (thread) =>
                        thread.threadId === currThreadId
                );

                const updatedThread = {
                    threadId: currThreadId,
                    title:
                        data.title ||
                        existingThread?.title ||
                        currentPrompt ||
                        imagesToSend[0]?.name ||
                        "Image conversation"
                };

                return [
                    updatedThread,
                    ...previousThreads.filter(
                        (thread) =>
                            thread.threadId !== currThreadId
                    )
                ];
            });

        } catch (error) {
            // Remove the optimistic message after failure.
            setPrevChats((previousChats) =>
                previousChats.filter(
                    (chat) => chat.id !== optimisticMessageId
                )
            );

            // Restore the prompt and image attachments so the user
            // can retry. Their preview URLs have not been revoked.
            setPrompt(currentPrompt);
            setSelectedImages(imagesToSend);

            console.error("Error getting reply:", error);
            window.alert(error.message);

        } finally {
            setLoading(false);
        }
    };

    // Append assistant response only once
    useEffect(() => {
        if (!reply) {
            handledReplyRef.current = null;
            return;
        }

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

    // Regenerate latest assistant response
    const handleRegenerate = async () => {
        if (!user) {
            requireLogin();
            return;
        }

        if (
            loading ||
            !currThreadId ||
            !prevChats?.length
        ) {
            return;
        }

        const lastMessage =
            prevChats[prevChats.length - 1];

        if (lastMessage?.role !== "assistant") return;

        setLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/chat/${encodeURIComponent(currThreadId)}/regenerate`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            if (response.status === 401) {
                setUser(null);
                requireLogin();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();

                throw new Error(
                    errorData.error ||
                    "Failed to regenerate response"
                );
            }

            const data = await response.json();

            handledReplyRef.current = data.reply;

            // Replace latest assistant response
            setPrevChats((previousChats) => {
                const updatedChats = [...previousChats];

                const lastIndex = updatedChats.length - 1;

                if (
                    updatedChats[lastIndex]?.role === "assistant"
                ) {
                    updatedChats[lastIndex] = {
                        ...updatedChats[lastIndex],
                        content: data.reply
                    };
                }

                return updatedChats;
            });

            setReply(data.reply);

        } catch (error) {
            console.error("Regenerate error:", error);
            window.alert(error.message);

        } finally {
            setLoading(false);
        }
    };

    // Create shareable conversation URL
    const handleShareConversation = async () => {
        if (!user) {
            requireLogin();
            return;
        }

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
                    method: "POST",
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                setUser(null);
                requireLogin();
                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to create share link"
                );
            }

            if (!data.shareId) {
                throw new Error(
                    "Share ID was not returned by the server"
                );
            }

            const generatedUrl =
                `${window.location.origin}/share/${data.shareId}`;

            setShareUrl(generatedUrl);
            setCopiedShareLink(false);
            setShowShareModal(true);

        } catch (error) {
            console.error("Share error:", error);
            window.alert(error.message);

        } finally {
            setIsSharing(false);
        }
    };

    // Copy share URL
    const handleCopyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedShareLink(true);

        } catch (error) {
            console.error("Copy link failed:", error);

            window.prompt(
                "Copy your sharing link:",
                shareUrl
            );
        }
    };

    // Native sharing
    const handleNativeShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "PromptFlow conversation",
                    text: "Check out this conversation on PromptFlow.",
                    url: shareUrl
                });
            } else {
                await handleCopyShareLink();
            }

        } catch (error) {
            if (error.name !== "AbortError") {
                console.error(
                    "Native sharing failed:",
                    error
                );
            }
        }
    };

    // Close share popup
    const closeShareModal = () => {
        setShowShareModal(false);
        setCopiedShareLink(false);
    };

    // Keyboard behaviour controlled by Settings
    const handleKeyDown = (e) => {
        if (
            e.key === "Enter" &&
            enterToSend &&
            !e.shiftKey
        ) {
            e.preventDefault();
            getReply();
        }

        if (e.key === "Escape") {
            if (showShareModal) {
                closeShareModal();
            } else if (isExpanded) {
                setIsExpanded(false);
            }
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

                {/* Share conversation */}
                <button
                    type="button"
                    className="messageActionButton"
                    style={{ marginLeft: "auto" }}
                    onClick={handleShareConversation}
                    disabled={
                        !prevChats?.length ||
                        loading ||
                        isSharing
                    }
                    title="Share conversation"
                    aria-label="Share conversation"
                >
                    <i className="fa-solid fa-share-nodes"></i>

                    <span>
                        {isSharing ? "Sharing..." : "Share"}
                    </span>
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

                    {/* Hidden image picker */}
                    <input
                        ref={fileInputRef}
                        className="imageAttachmentInput"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleImageSelection}
                        aria-label="Choose images to attach"
                    />

                    {/* Selected image previews */}
                    {selectedImages.length > 0 && (
                        <div className="attachmentPreviewList">

                            {selectedImages.map((image) => (
                                <div
                                    className="attachmentPreviewItem"
                                    key={image.id}
                                >
                                    <img
                                        className="attachmentPreviewThumb"
                                        src={image.previewUrl}
                                        alt={image.name}
                                    />

                                    <span
                                        className="attachmentPreviewName"
                                        title={image.name}
                                    >
                                        {image.name}
                                    </span>

                                    <button
                                        type="button"
                                        className="attachmentPreviewRemove"
                                        onClick={() =>
                                            removeSelectedImage(image.id)
                                        }
                                        title={`Remove ${image.name}`}
                                        aria-label={`Remove ${image.name}`}
                                    >
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            ))}

                        </div>
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

                        {/* Upload image button - styled like Think */}
                        <button
                            type="button"
                            className="thinkLabel"
                            title="Upload images"
                            aria-label="Upload images"
                            disabled={loading}
                            onClick={() => {
                                if (!user) {
                                    requireLogin();
                                    return;
                                }

                                fileInputRef.current?.click();
                            }}
                        >
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                            <span>Upload image</span>
                        </button>

                        <div className="composerRightActions">

                            <button
                                type="button"
                                className="thinkLabel"
                                title="Think"
                                onClick={() => {
                                    if (!user) requireLogin();
                                }}
                            >
                                <i className="fa-solid fa-brain"></i>
                                <span>Think</span>
                            </button>

                            <button
                                type="button"
                                className="voiceIcon"
                                title="Voice input"
                                onClick={() => {
                                    if (!user) requireLogin();
                                }}
                            >
                                <i className="fa-solid fa-microphone"></i>
                            </button>

                            <button
                                type="submit"
                                className="sendButton"
                                disabled={
                                    (!prompt.trim() &&
                                    selectedImages.length === 0) ||
                                    loading
                                }
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

            {/* SHARE LINK MODAL */}
            {showShareModal && (
                <div
                    className="shareModalOverlay"
                    onClick={closeShareModal}
                >
                    <div
                        className="shareModal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="shareModalTitle"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className="shareModalHeader">

                            <h3 id="shareModalTitle">
                                Share conversation
                            </h3>

                            <button
                                type="button"
                                onClick={closeShareModal}
                                aria-label="Close sharing popup"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                        </div>

                        <p>
                            Anyone with this link can view your shared
                            conversation.
                        </p>

                        <div className="shareUrlContainer">

                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                aria-label="Conversation sharing URL"
                                onFocus={(e) => e.target.select()}
                            />

                            <button
                                type="button"
                                onClick={handleCopyShareLink}
                            >
                                <i
                                    className={`fa-solid ${
                                        copiedShareLink
                                            ? "fa-check"
                                            : "fa-copy"
                                    }`}
                                ></i>

                                {copiedShareLink
                                    ? "Copied!"
                                    : "Copy link"}
                            </button>

                        </div>

                        <button
                            type="button"
                            className="nativeShareButton"
                            onClick={handleNativeShare}
                        >
                            <i className="fa-solid fa-share-nodes"></i>
                            <span>Share via...</span>
                        </button>

                    </div>
                </div>
            )}

        </div>
    );
}

export default ChatWindow;
