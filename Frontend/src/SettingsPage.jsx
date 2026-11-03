
import { useContext } from "react";
import { MyContext } from "./MyContext.jsx";
import "./SettingsPage.css";

function SettingsPage() {
    const {
        theme,
        setTheme,
        enterToSend,
        setEnterToSend,
        confirmDelete,
        setConfirmDelete,
        setActiveView
    } = useContext(MyContext);

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
                    <h1>Settings</h1>
                    <p>Configure your PromptFlow experience.</p>
                </div>

                <section className="settingsSection">
                    <h2>Appearance</h2>

                    <div className="settingsOption">
                        <div>
                            <strong>Theme</strong>
                            <p>Choose how PromptFlow looks.</p>
                        </div>

                        <div className="themeOptions">
                            <button
                                className={theme === "dark" ? "selected" : ""}
                                onClick={() => setTheme("dark")}
                            >
                                <i className="fa-solid fa-moon"></i>
                                Dark
                            </button>

                            <button
                                className={theme === "light" ? "selected" : ""}
                                onClick={() => setTheme("light")}
                            >
                                <i className="fa-solid fa-sun"></i>
                                Light
                            </button>
                        </div>
                    </div>
                </section>

                <section className="settingsSection">
                    <h2>Chat preferences</h2>

                    <div className="settingsOption">
                        <div>
                            <strong>Press Enter to send</strong>
                            <p>
                                Send a message using Enter.
                                Shift + Enter inserts a new line.
                            </p>
                        </div>

                        <input
                            className="settingsToggle"
                            type="checkbox"
                            checked={enterToSend}
                            onChange={(e) =>
                                setEnterToSend(e.target.checked)
                            }
                            aria-label="Press Enter to send"
                        />
                    </div>

                    <div className="settingsOption">
                        <div>
                            <strong>Confirm before deleting</strong>
                            <p>
                                Ask for confirmation before deleting
                                a conversation.
                            </p>
                        </div>

                        <input
                            className="settingsToggle"
                            type="checkbox"
                            checked={confirmDelete}
                            onChange={(e) =>
                                setConfirmDelete(e.target.checked)
                            }
                            aria-label="Confirm before deleting"
                        />
                    </div>
                </section>

                <p className="settingsSaveNote">
                    <i className="fa-solid fa-check-circle"></i>
                    Your preferences are saved automatically.
                </p>

            </div>
        </main>
    );
}

export default SettingsPage;
