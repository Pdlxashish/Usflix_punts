# 🎬 USFLIX - Personal Memory Streaming Platform

A Netflix-style streaming platform for your personal photos and videos. Built with React, TanStack Router, Express, and PostgreSQL.

![USFLIX](https://img.shields.io/badge/Status-Production%20Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

- 🎥 **Video Streaming** - Netflix-style video player with resume, autoplay, and comments
- 📸 **Photo Albums** - Beautiful photo galleries with lightbox viewing
- 🎙️ **Voice Notes** - Record and playback audio memories
- 👥 **Multi-Profile** - Support for multiple user profiles
- 💬 **Comments** - Add timestamped notes to videos
- 🎨 **Customizable Branding** - Personalize your platform
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔐 **Admin Panel** - Secure content management
- ☁️ **Cloud Storage Ready** - Supports AWS S3 and Cloudflare R2

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd memory-flix-for-us-main
```

### 2. Setup Environment

**Windows:**
```powershell
.\scripts\setup-env.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

### 3. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### 4. Start Database

**Option A: Using Docker**
```bash
docker-compose up db -d
```

**Option B: Local PostgreSQL**
- Create database: `createdb usflix`
- Update `backend/.env` with your database URL

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev
```

### 6. Access Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **Admin Login**: Use credentials from seed data

---

## 📦 Project Structure

```
memory-flix-for-us-main/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── db/             # Database schema and connection
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, security middleware
│   │   └── config/         # Configuration files
│   ├── uploads/            # Local file storage
│   └── Dockerfile          # Backend Docker config
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── routes/            # TanStack Router pages
│   ├── context/           # React context providers
│   └── data/              # Static data
├── scripts/               # Deployment scripts
├── docker-compose.yml     # Docker orchestration
└── DEPLOYMENT.md          # Production deployment guide
```

---

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI framework
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Lucide Icons** - Icon library

### Backend
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **Sharp** - Image processing
- **HEIC Convert** - iPhone photo support

### DevOps
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Railway/Vercel** - Hosting platforms

---

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment (Cloudflare + API)
- **[Storage Architecture](STORAGE_ARCHITECTURE.md)** - File storage system explained

---

## 🚀 Deployment

### Quick Deploy to Railway + Vercel

1. **Backend (Railway)**
   ```bash
   # Push to GitHub
   git push origin main
   
   # Deploy on Railway
   # - Connect GitHub repo
   # - Add PostgreSQL database
   # - Set environment variables
   ```

2. **Frontend (Vercel)**
   ```bash
   # Deploy to Vercel
   vercel --prod
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

---

## 🔒 Security

- ✅ JWT authentication
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Security headers
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection

---

## 🎯 Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:8080
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3001
```

See `.env.example` files for complete list.

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
npm test

# Build for production
npm run build
```

---

## 📝 Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run dev:api          # Start backend dev server

# Build
npm run build            # Build frontend for production
cd backend && npm run build  # Build backend

# Deployment
node scripts/generate-jwt-secret.js  # Generate JWT secret
./scripts/setup-env.sh              # Setup environment files
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

- 📖 Read the [Deployment Guide](DEPLOYMENT.md)
- 🐛 Report issues on GitHub
- 💬 Ask questions in Discussions

---

## 🎉 Acknowledgments

- Built with [TanStack Router](https://tanstack.com/router)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ for preserving memories**
