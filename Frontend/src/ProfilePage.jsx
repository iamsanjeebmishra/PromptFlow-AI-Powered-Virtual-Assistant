
import { useContext } from "react";
import { MyContext } from "./MyContext.jsx";
import "./ProfilePage.css";

function getInitials(name = "") {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "U";

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (
        parts[0][0] + parts[parts.length - 1][0]
    ).toUpperCase();
}

function ProfilePage() {
    const { user, setActiveView } = useContext(MyContext);

    if (!user) return null;

    const initials = getInitials(user.name || "User");

    return (
        <main className="profilePage">
            <div className="profilePageInner">

                <button
                    className="profileBackButton"
                    onClick={() => setActiveView("chat")}
                >
                    <i className="fa-solid fa-arrow-left"></i>
                    Back to chats
                </button>

                <div className="profilePageHeading">
                    <h1>Profile</h1>
                    <p>
                        Manage your PromptFlow account information.
                    </p>
                </div>

                <section className="profileOverviewCard">

                    <div className="profileOverviewHeader">

                        <div className="profileLargeAvatar">
                            {user.profilePicture ? (
                                <img
                                    src={user.profilePicture}
                                    alt={user.name || "Profile"}
                                />
                            ) : (
                                initials
                            )}
                        </div>

                        <div className="profileOverviewIdentity">
                            <h2>{user.name || "User"}</h2>
                            <p>{user.email}</p>
                        </div>

                    </div>

                    <div className="profileCardDivider"></div>

                    <h3>Account information</h3>

                    <div className="profileDetailsGrid">

                        <div className="profileDetail">
                            <span>Full name</span>
                            <strong>{user.name || "Not available"}</strong>
                        </div>

                        <div className="profileDetail">
                            <span>Email address</span>
                            <strong>{user.email || "Not available"}</strong>
                        </div>

                        <div className="profileDetail">
                            <span>Account</span>
                            <strong>PromptFlow account</strong>
                        </div>

                        <div className="profileDetail">
                            <span>Authentication</span>
                            <strong>Active session</strong>
                        </div>

                    </div>

                </section>

            </div>
        </main>
    );
}

export default ProfilePage;
