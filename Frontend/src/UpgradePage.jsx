
import "./UpgradePage.css";
import { useContext } from "react";
import { MyContext } from "./MyContext.jsx";

function UpgradePage() {
    const { setActiveView } = useContext(MyContext);

    return (
        <main className="utilityPage upgradePage">
            <button
                className="utilityBackButton"
                onClick={() => setActiveView("chat")}
            >
                <i className="fa-solid fa-arrow-left"></i>
                <span>Back to chats</span>
            </button>

            <div className="upgradeHeading">
                <div className="upgradeHeadingIcon">
                    <i className="fa-solid fa-crown"></i>
                </div>

                <h1>Upgrade your experience</h1>

                <p>
                    Explore PromptFlow plans and find the right experience
                    for your workflow.
                </p>
            </div>

            <div className="upgradePlanGrid">
                <section className="upgradePlanCard currentPlan">
                    <div className="upgradePlanTop">
                        <div>
                            <span className="upgradePlanLabel">YOUR PLAN</span>
                            <h2>Free</h2>
                        </div>

                        <span className="upgradePlanStatus">
                            Current plan
                        </span>
                    </div>

                    <p className="upgradePlanDescription">
                        Your current PromptFlow experience.
                    </p>

                    <div className="upgradePlanDivider"></div>

                    <ul className="upgradeFeatureList">
                        <li>
                            <i className="fa-solid fa-check"></i>
                            <span>Access to your existing chats</span>
                        </li>
                        <li>
                            <i className="fa-solid fa-check"></i>
                            <span>Save and manage conversations</span>
                        </li>
                        <li>
                            <i className="fa-solid fa-check"></i>
                            <span>Personalize your workspace</span>
                        </li>
                    </ul>

                    <button className="upgradePlanButton currentPlanButton" disabled>
                        Current plan
                    </button>
                </section>

                <section className="upgradePlanCard proPlan">
                    <div className="upgradePlanTop">
                        <div>
                            <span className="upgradePlanLabel">PREMIUM</span>
                            <h2>
                                <i className="fa-solid fa-crown"></i>
                                PromptFlow Pro
                            </h2>
                        </div>

                        <span className="upgradePlanStatus comingSoon">
                            Coming soon
                        </span>
                    </div>

                    <p className="upgradePlanDescription">
                        An enhanced PromptFlow experience is in development.
                    </p>

                    <div className="upgradePlanDivider"></div>

                    <div className="upgradeComingSoonContent">
                        <i className="fa-solid fa-rocket"></i>
                        <h3>Something better is on the way.</h3>
                        <p>
                            Plan features, pricing, and subscription options
                            will be announced here.
                        </p>
                    </div>

                    <button
                        className="upgradePlanButton proPlanButton"
                        disabled
                    >
                        Coming soon
                    </button>
                </section>
            </div>

            <p className="upgradeFooterNote">
                <i className="fa-solid fa-circle-info"></i>
                Subscription and payment services are not available yet.
            </p>
        </main>
    );
}

export default UpgradePage;
