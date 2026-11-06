# 🚀 PromptFlow – AI-Powered Virtual Assistant

**PromptFlow** is a full-stack AI-powered virtual assistant that enables users to have intelligent conversations, manage chat history, upload images, and share conversations through unique links.

Built with React, Node.js, Express, and MongoDB, PromptFlow integrates the **OpenAI GPT-4o mini model** to provide AI-powered conversational experiences.

🌐 **Live Demo:** [Try PromptFlow](https://promptflow-ai-powered-virtual-assistant-xhhg.onrender.com/)

---

## ✨ Features

### 🤖 AI-Powered Conversations
- Integrated OpenAI API with the **GPT-4o mini model**.
- Supports AI-powered text and image-based conversations.
- Maintains conversation context using chat history.
- Regenerate AI responses.
- Organize conversations into separate chat threads.

### 🔐 Authentication & Security
- User authentication using **Passport.js** and Passport Local Strategy.
- Password hashing using **bcrypt** with salt.
- Session-based authentication using Express Session.
- Persistent session storage using **Connect-Mongo**.
- MongoDB-backed session management.

### 💬 Chat Management
- Create and manage multiple conversations.
- Maintain individual conversation histories.
- Continue previous conversations.
- Manage chat threads through backend APIs.

### 🖼️ Image Upload & Storage
- Upload images directly through the chat interface.
- Preview and remove selected images before sending.
- Store uploaded images using **MongoDB GridFS**.
- Support image-based interactions with the AI model.

### 🔗 Conversation Sharing
- Generate shareable conversation links.
- Allow others to view shared conversations.
- Preserve associated image references in shared conversations.

### ☁️ Deployment
- Frontend and backend deployed separately on Render.
- Configured production environment variables.
- Configured CORS for frontend-backend communication.
- Secure session cookies for production deployment.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript, CSS |
| Backend | Node.js 24.19.0, Express.js 5 |
| Database | MongoDB, Mongoose |
| Authentication | Passport.js, Passport Local Strategy |
| Password Security | bcrypt |
| Session Management | Express Session, Connect-Mongo |
| AI Integration | OpenAI API, GPT-4o mini |
| Image Storage | MongoDB GridFS |
| API Architecture | RESTful APIs |
| Deployment | Render |

## ⚙️ Installation & Setup

Follow these steps to run PromptFlow locally.

### 1. Clone the Repository

```bash
git clone https://github.com/iamsanjeebmishra/PromptFlow-AI-Powered-Virtual-Assistant.git
```

```bash
cd PromptFlow-AI-Powered-Virtual-Assistant
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd Backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `Backend` directory:

```env
PORT=8080

MONGODB_URL=your_mongodb_connection_string

OPENAI_API_KEY=your_openai_api_key

SESSION_SECRET=your_session_secret

FRONTEND_URL=http://localhost:5173
```

Start the backend development server:

```bash
npm run dev
```

Or start it in production mode:

```bash
npm start
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd Frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `Frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Start the frontend development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

---

## 🔑 Environment Variables

### Backend

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `MONGODB_URL` | MongoDB connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `SESSION_SECRET` | Secret used for session configuration |
| `FRONTEND_URL` | Allowed frontend origin for CORS |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL, including the `/api` prefix |

**Important:** Replace the example values with your own credentials. Never commit `.env` files or expose API keys and session secrets in your public repository.

---

## 🚀 Future Improvements

- Improve chat search and organization.
- Add more customization options.
- Enhance the user experience and responsive design.
- Introduce additional AI-powered capabilities.
- Improve error handling and application performance.

---

## 👨‍💻 Author

**Sanjeeb Kumar Mishra**

🌐 **Live Application:**  
https://promptflow-ai-powered-virtual-assistant-xhhg.onrender.com/

---

⭐ **If you find this project interesting, consider giving the repository a star!**

💬 Feedback and suggestions are always welcome. Feel free to explore the live application and report bugs or ideas for improvement.
