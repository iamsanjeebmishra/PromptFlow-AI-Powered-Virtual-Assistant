
import "dotenv/config";

// Common function to call OpenAI
const callOpenAI = async (messages) => {
    const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error?.message || "OpenAI API request failed"
        );
    }

    return data.choices[0].message.content.trim();
};


// Generate assistant response using conversation history
const getOpenAiAPIResponse = async (conversation) => {
    try {
        // Support both a single message and conversation history
        const messages = Array.isArray(conversation)
            ? conversation
            : [
                {
                    role: "user",
                    content: conversation
                }
            ];

        const reply = await callOpenAI(messages);

        return reply;
    } catch (error) {
        console.error("OpenAI response error:", error);
        throw error;
    }
};


// Generate short conversation title
export const generateChatTitle = async (message) => {
    try {
        const title = await callOpenAI([
            {
                role: "system",
                content:
                    "Generate a concise, meaningful title for this conversation. Use 4-7 words maximum. Return only the title, without quotation marks or explanation."
            },
            {
                role: "user",
                content: message
            }
        ]);

        return title.replace(/^["']|["']$/g, "").slice(0, 60);
    } catch (error) {
        console.error("Title generation error:", error);

        // Fallback if title generation fails
        return message.length > 40
            ? message.substring(0, 40).trim() + "..."
            : message;
    }
};

export default getOpenAiAPIResponse;
