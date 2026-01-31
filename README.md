# Full Stack Boilerplate (JavaScript + TypeScript)

A modern full-stack application boilerplate with both JavaScript and TypeScript versions.

## 🎯 Choose Your Version

### TypeScript Version (Recommended) ⭐
- **Backend:** `backend-ts/` - Node.js + Express + TypeScript
- **Frontend:** `frontend-ts/` - React + Vite + TypeScript
- Full type safety and IntelliSense
- Better error catching at compile time
- See `TYPESCRIPT_GUIDE.md` for setup

### JavaScript Version
- **Backend:** `backend/` - Node.js + Express
- **Frontend:** `frontend/` - React + Vite
- Original JavaScript implementation
- See sections below for setup

---

## 📦 TypeScript Project Structure

```
.
├── backend-ts/           # TypeScript Node.js Express API
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Route controllers
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── types/        # TypeScript interfaces
│   │   └── server.ts     # Main server file
│   ├── dist/             # Compiled output
│   └── tsconfig.json     # TypeScript config
│
├── frontend-ts/          # TypeScript React application
│   ├── src/
│   │   ├── types/        # TypeScript interfaces
│   │   ├── App.tsx       # Main component
│   │   └── main.tsx      # Entry point
│   └── tsconfig.json     # TypeScript config
│
└── TYPESCRIPT_GUIDE.md   # Complete TypeScript guide
```

---

## 🚀 Quick Start (TypeScript)

### Backend TypeScript

```bash
cd backend-ts
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```

### Frontend TypeScript

```bash
cd frontend-ts
npm install
npm run dev
```

**TypeScript Benefits:**
- ✅ Full IntelliSense in your IDE
- ✅ Catch errors before runtime
- ✅ Better refactoring
- ✅ Self-documenting code

---

## 🔧 JavaScript Version (Original)

### JavaScript Project Structure

```
.
├── backend/              # Node.js Express API
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── server.js
│
└── frontend/             # React application
    ├── src/
    │   ├── App.jsx
    │   └── main.jsx
    └── vite.config.js
```

### Backend Setup (JavaScript)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend Setup (JavaScript)

```bash
cd frontend
npm install
npm run dev
```

---

## 🗄️ Database Schemas

### Users
- name (string, required)
- email (string, unique, required)
- password (string, required)
- age (number, optional)
- role (enum: user/admin/moderator)
- isActive (boolean)

### Potentials
- potential (string, required)
- itemType (string, required)
- probability (decimal, 0-1)
- tier (enum: rare/epic/unique/legendary)
- uniqueKeyId (string, unique)

---

## 📚 API Endpoints

### Users API
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Potentials API
- `GET /api/potentials` - Get all potentials
- `POST /api/potentials` - Create potential
- `GET /api/potentials/:id` - Get single potential
- `GET /api/potentials/key/:uniqueKeyId` - Get by unique key
- `PUT /api/potentials/:id` - Update potential
- `DELETE /api/potentials/:id` - Delete potential
- `GET /api/potentials/tier/:tier` - Get by tier
- `GET /api/potentials/itemtype/:itemType` - Get by item type

See `backend/POTENTIALS_API.md` for full API documentation.

---

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- TypeScript (TS version)
- CORS
- dotenv

### Frontend
- React 18
- Vite
- TypeScript (TS version)
- Modern CSS

---

## 📖 Documentation

- **TypeScript Guide:** `TYPESCRIPT_GUIDE.md` - Complete TypeScript setup and patterns
- **Database Guide:** `backend/DATABASE_GUIDE.md` - Schema design and best practices
- **API Documentation:** `backend/POTENTIALS_API.md` - Complete API reference

---

## 🎓 Learning Path

### Start with JavaScript
If you're new to Node.js/React:
1. Use `backend/` and `frontend/` folders
2. Learn the basics without TypeScript complexity
3. Understand how Express and React work

### Move to TypeScript
When ready for type safety:
1. Switch to `backend-ts/` and `frontend-ts/`
2. Read `TYPESCRIPT_GUIDE.md`
3. Enjoy better developer experience!

---

## 🔥 Features

- ✅ RESTful API architecture
- ✅ MongoDB integration with Mongoose
- ✅ Full CRUD operations
- ✅ Input validation
- ✅ Error handling
- ✅ CORS enabled
- ✅ Environment variables
- ✅ Hot reload for development
- ✅ TypeScript support (optional)
- ✅ Type-safe models and controllers
- ✅ API proxy configuration

---

## 🧪 Development

### Backend (TypeScript)
```bash
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm start        # Run compiled code
npm run watch    # Watch mode compilation
```

### Backend (JavaScript)
```bash
npm run dev      # Development with nodemon
npm start        # Production server
```

### Frontend (Both)
```bash
npm run dev      # Development server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## 📝 Next Steps

- [ ] Add authentication (JWT, bcrypt)
- [ ] Add password hashing
- [ ] Add input validation middleware
- [ ] Add request logging (morgan)
- [ ] Add rate limiting
- [ ] Add API documentation (Swagger)
- [ ] Add testing (Jest, React Testing Library)
- [ ] Add state management (Redux, Zustand)
- [ ] Add CI/CD pipeline
- [ ] Deploy to production

---

## 🤝 Contributing

Feel free to use this boilerplate as a starting point for your projects!

## 📄 License

MIT

---

## 🆘 Need Help?

Check out these resources:
- TypeScript setup: Read `TYPESCRIPT_GUIDE.md`
- Database schemas: Read `backend/DATABASE_GUIDE.md`
- API endpoints: Read `backend/POTENTIALS_API.md`
- Original README: This file!

Happy coding! 🚀
