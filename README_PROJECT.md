# SDG 3 Health Platform - Disease Outbreak Prediction System

A full-stack web application for disease outbreak prediction and health intelligence, powered by AI agents and machine learning.

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 20.19+ or 22.12+ (required by the frontend toolchain)
- npm or yarn

### Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
source venv/bin/activate         # Linux/Mac
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd sdg3-health-platform
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📋 Features

### 🔐 Authentication System
- User registration and login with JWT tokens
- Role-based access control (User/Admin)
- Admin registration with secret key: `SDG3_ADMIN_2026`
- Password hashing with Argon2
- 24-hour token expiration

### 📊 Outbreak Prediction
- Multi-factor risk analysis (health, environmental, population data)
- Risk scoring (0-100) with classification (Low/Medium/High)
- Weekly projections (4 weeks)
- Monthly projections (3 months)
- Climate variation simulation
- Prediction history tracking

### 🤖 AI Chatbot System
**Intelligent Multi-Agent Architecture:**
- **Knowledge Agent** - Disease information, symptoms, prevention
- **Prediction Agent** - Outbreak analysis, risk factors, user predictions
- **Report Agent** - Government advisories, emergency protocols
- **Agent Controller** - Intent detection and routing

**Phase 7: Intelligence Guardrails**
- Domain restriction (health-related queries only)
- Hallucination prevention (data-grounded responses)
- Graceful rejection of off-topic queries

**Phase 8: UI Enhancements**
- Markdown support for rich formatting
- Clear chat button
- Improved timestamps (12-hour format)
- Risk highlighting (High/Medium/Low color-coded)
- Typing animation
- Performance optimized

### 👨‍💼 Admin Dashboard
- View all users and predictions
- System statistics
- Update case data
- Send warnings/notifications

### 📈 User Dashboard
- View outbreak trends
- Access prediction history
- Generate health reports
- Interactive data visualization

---

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration
│   ├── database.py             # Database setup
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py
│   │   └── prediction.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── user_schema.py
│   │   ├── prediction_schema.py
│   │   └── chat_schema.py
│   ├── routes/                 # API endpoints
│   │   ├── auth_routes.py
│   │   ├── prediction_routes.py
│   │   ├── admin_routes.py
│   │   └── chat_routes.py
│   ├── services/               # Business logic
│   │   ├── agents/             # AI agent system
│   │   │   ├── agent_controller.py
│   │   │   ├── knowledge_agent.py
│   │   │   ├── prediction_agent.py
│   │   │   └── report_agent.py
│   │   ├── prediction_service.py
│   │   └── report_service.py
│   └── utils/                  # Utilities
│       ├── security.py
│       └── role_checker.py
├── requirements.txt
└── .env
```

### Frontend (React + Vite)
```
sdg3-health-platform/
├── src/
│   ├── main.jsx                # Entry point
│   ├── App.jsx                 # Main app component
│   ├── index.css               # Global styles
│   ├── components/             # Reusable components
│   │   ├── Sidebar.jsx
│   │   ├── AdminSidebar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ...
│   ├── pages/                  # Page components
│   │   ├── LandingPage.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── WhatsHappening.jsx
│   │   ├── PredictOutbreak.jsx
│   │   ├── Chatbot.jsx
│   │   ├── Profile.jsx
│   │   ├── Feedback.jsx
│   │   └── AdminDashboard.jsx
│   ├── context/                # React context
│   │   └── AuthContext.jsx
│   └── layouts/                # Layout components
│       └── MainLayout.jsx
├── package.json
└── vite.config.js
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signup/admin` - Admin registration (requires secret key)
- `POST /api/auth/login` - User/Admin login
- `GET /api/auth/me` - Get current user profile

### Predictions (`/api/predictions`)
- `POST /api/predictions/analyze` - Calculate outbreak risk
- `POST /api/predictions/save` - Save prediction to history
- `GET /api/predictions/history` - Get user's prediction history
- `GET /api/predictions/{id}` - Get specific prediction
- `DELETE /api/predictions/{id}` - Delete prediction

### Chat (`/api/chat`)
- `POST /api/chat` - Chat with AI assistant

### Admin (`/api/admin`)
- `GET /api/admin/users` - List all users
- `GET /api/admin/predictions` - List all predictions
- `GET /api/admin/statistics` - System statistics
- `POST /api/admin/case-data` - Update case data
- `POST /api/admin/warnings` - Send warnings

---

## 🗄️ Database Schema

### User Model
```python
- id: UUID (primary key)
- email: String (unique, indexed)
- password_hash: String
- name: String
- role: Enum (user, admin)
- created_at: DateTime
- updated_at: DateTime
```

### Prediction Model
```python
- id: UUID (primary key)
- user_id: UUID (foreign key)
- created_at: DateTime
- health_data: JSON
- environmental_data: JSON
- population_data: JSON
- risk_score: Float
- risk_level: String
- weekly_projections: JSON
- monthly_projections: JSON
- report_data: JSON
```

---

## 🔧 Configuration

### Backend Environment Variables (`.env`)
```env
DATABASE_URL=sqlite:///./sdg3.db
SECRET_KEY=your-secret-key-here
ADMIN_SECRET_KEY=SDG3_ADMIN_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Frontend Configuration
- API Base URL: `http://localhost:8000`
- CORS enabled for: `localhost:5173`, `localhost:5174`, `localhost:3000`

---

## 🧪 Testing

### Test User Accounts
Create accounts via signup or use these test credentials:

**Regular User:**
- Email: user@example.com
- Password: password123

**Admin User:**
- Email: admin@example.com
- Password: admin123
- Admin Secret: SDG3_ADMIN_2026

### Testing Chatbot

**Valid Health Queries:**
- "What are the symptoms of malaria?"
- "How can I prevent dengue?"
- "Show me my last prediction"
- "Generate a health advisory"

**Off-Topic Queries (Should be rejected):**
- "What's the weather today?"
- "Tell me a joke"
- "Who won the game?"

### Testing Risk Highlighting
Send queries containing:
- "high risk", "critical", "severe" → Red highlight
- "medium risk", "moderate", "caution" → Yellow highlight
- "low risk", "minimal", "safe" → Green highlight

---

## 🛠️ Technology Stack

### Backend
- **Framework:** FastAPI
- **Database:** SQLite (dev), PostgreSQL (production)
- **ORM:** SQLAlchemy
- **Authentication:** JWT (python-jose)
- **Password Hashing:** Argon2
- **Validation:** Pydantic v2

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Markdown:** react-markdown

---

## 🚨 Troubleshooting

### Backend Issues

**Issue: Module not found**
```bash
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

**Issue: Database error**
```bash
# Delete database and restart
rm sdg3.db
python -m uvicorn app.main:app --reload --port 8000
```

**Issue: Port already in use**
```bash
# Change port
python -m uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**Issue: Dependencies not installed**
```bash
cd sdg3-health-platform
npm install
```

**Issue: CORS error**
- Ensure backend is running on port 8000
- Check CORS configuration in `backend/app/main.py`

**Issue: Authentication error**
- Clear localStorage: `localStorage.clear()`
- Login again

---

## 📦 Dependencies

### Backend (`requirements.txt`)
```
fastapi
uvicorn[standard]
sqlalchemy
python-jose[cryptography]
argon2-cffi
python-multipart
pydantic
pydantic-settings
python-dotenv
email-validator
```

### Frontend (`package.json`)
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.13.1",
    "axios": "^1.13.6",
    "framer-motion": "^12.34.3",
    "lucide-react": "^0.575.0",
    "react-markdown": "^9.0.1",
    "tailwindcss": "^4.2.1",
    "jspdf": "^4.2.0"
  }
}
```

---

## 🔒 Security Features

- JWT token-based authentication
- Argon2 password hashing
- Role-based access control (RBAC)
- Protected routes (frontend & backend)
- CORS configuration
- Input validation with Pydantic
- SQL injection prevention via ORM
- XSS protection
- Environment variable configuration

---

## 🎯 Key Features by Role

### Regular Users
✅ Register and login
✅ Predict disease outbreaks
✅ View prediction history
✅ Chat with AI assistant
✅ Generate health reports
✅ View outbreak trends
✅ Update profile
✅ Submit feedback

### Admin Users
✅ All user features
✅ View all users
✅ View all predictions
✅ System statistics
✅ Update case data
✅ Send warnings
✅ Manage platform

---

## 📱 Responsive Design

- Mobile-first approach
- Responsive layouts for all screen sizes
- Touch-friendly interface
- Optimized for tablets and desktops

---

## 🚀 Deployment

### Backend Deployment
1. Set environment variables
2. Use PostgreSQL for production
3. Configure CORS for production domain
4. Use gunicorn or uvicorn workers
5. Set up SSL/TLS

### Frontend Deployment
1. Update API base URL
2. Build production bundle: `npm run build`
3. Deploy `dist/` folder to hosting service
4. Configure environment variables

---

## 📄 License

This project is developed for educational purposes as part of SDG 3 (Good Health and Well-being) initiative.

---

## 👥 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Check browser console for errors
4. Check backend logs for errors

---

## 🎉 Project Status

✅ **Phase 1:** Authentication System - Complete
✅ **Phase 2:** Prediction Engine - Complete
✅ **Phase 3:** Frontend Integration - Complete
✅ **Phase 4:** Agentic AI System - Complete
✅ **Phase 5:** Admin Dashboard - Complete
✅ **Phase 6:** User Dashboard - Complete
✅ **Phase 7:** Intelligence Guardrails - Complete
✅ **Phase 8:** UI Enhancements - Complete

**Current Version:** 1.0.0
**Status:** Production Ready

---

## 🔮 Future Enhancements

- LLM integration (OpenAI API)
- Conversation memory (5 messages per user)
- Real-time notifications
- Email verification
- Password reset
- Data export (CSV/PDF)
- Advanced analytics
- Multi-language support
- Mobile app

---

**Built with ❤️ for SDG 3: Good Health and Well-being**
