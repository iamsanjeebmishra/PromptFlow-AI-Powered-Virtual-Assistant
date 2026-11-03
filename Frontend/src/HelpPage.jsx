
import { useContext } from "react";
import { MyContext } from "./MyContext.jsx";
import "./HelpPage.css";

function HelpPage() {
    const { setActiveView } = useContext(MyContext);

    const helpItems = [
        {
            icon: "fa-regular fa-message",
            title: "How do I start a conversation?",
            description:
                "Click New Chat, enter your question in the message box and press Enter or click Send."
        },
        {
            icon: "fa-solid fa-clock-rotate-left",
            title: "Where can I find my previous chats?",
            description:
                "Your saved conversations appear under Recent in the sidebar when you are logged in."
        },
        {
            icon: "fa-solid fa-thumbtack",
            title: "How do I pin a conversation?",
            description:
                "Use the pin icon next to a conversation in the sidebar to keep it in the Pinned section."
        },
        {
            icon: "fa-solid fa-share-nodes",
            title: "How do I share a conversation?",
            description:
                "Open a conversation and use the Share option. Anyone with its public sharing link may be able to view that shared conversation."
        },
        {
            icon: "fa-solid fa-palette",
            title: "How do I change the theme?",
            description:
                "Open your profile menu and choose Theme to switch between Dark and Light mode. You can also change it in Settings."
        },
        {
            icon: "fa-solid fa-user-shield",
            title: "How do I manage my account?",
            description:
                "Open your profile menu to view your account details or log out."
        }
    ];

    return (
        <main className="utilityPage">
            <div className="utilityPageContent">

                <button
                    className="utilityBackButton"
                    onClick={() => setActiveView("chat")}
                >
                    <i className="fa-solid fa-arrow-left"></i>
                    Back to chats
                </button>

                <div className="utilityHeading">
                    <h1>Help Center</h1>
                    <p>
                        Find answers to common questions about PromptFlow.
                    </p>
                </div>

                <section className="helpGrid">
                    {helpItems.map((item, index) => (
                        <article className="helpCard" key={index}>
                            <div className="helpCardIcon">
                                <i className={item.icon}></i>
                            </div>

                            <h2>{item.title}</h2>
                            <p>{item.description}</p>
                        </article>
                    ))}
                </section>

                <section className="helpFooter">
                    <h2>Still need help?</h2>
                    <p>
                        Review your account and application preferences
                        from the Settings page.
                    </p>

                    <button onClick={() => setActiveView("settings")}>
                        Open Settings
                        <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </section>

            </div>
        </main>
    );
}

export default HelpPage;
