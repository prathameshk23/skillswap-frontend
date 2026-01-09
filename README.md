# SkillSwap - Peer-to-Peer Skill Exchange Platform

A modern, production-ready skill exchange platform built with Next.js, Firebase Authentication, and shadcn/ui.

## Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn/ui** (UI components)
- **Firebase Authentication** (Google Sign-In only)
- **Lucide React** (Icons)

### Backend Integration
- REST API communication
- JWT-based authorization
- Express.js backend (separate repository)

## Features

### Authentication
- ✅ Google Sign-In via Firebase
- ✅ Secure token exchange with backend
- ✅ Protected routes with middleware
- ✅ Persistent auth state

### Core Functionality
- ✅ **Skill Feed** - Browse and search available skills
- ✅ **Create Skills** - Offer your expertise to others
- ✅ **Manage Skills** - View and edit your skill offerings
- ✅ **Requests** - Handle incoming and outgoing skill exchange requests
- ✅ **User Profiles** - View user details, skills, and ratings
- ✅ **Rating System** - Rate completed skill exchanges
- ✅ **Video Session UI** - Layout for video calls (WebRTC not yet implemented)

## Project Structure

```
skill-swapp/
├── app/
│   ├── dashboard/          # Main skill feed
│   ├── login/              # Google authentication
│   ├── profile/[id]/       # User profiles
│   ├── requests/           # Request management
│   ├── session/[id]/       # Video session UI
│   ├── skills/
│   │   ├── create/         # Create new skill
│   │   └── my/             # My skills list
│   ├── layout.tsx          # Root layout with AuthProvider
│   └── page.tsx            # Home (redirects to login/dashboard)
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── navbar.tsx          # Main navigation
│   ├── skill-card.tsx      # Skill display card
│   ├── request-card.tsx    # Request display card
│   └── rating-dialog.tsx   # Rating submission dialog
├── lib/
│   ├── firebase.ts         # Firebase configuration
│   ├── api.ts              # Backend API client
│   ├── auth-context.tsx    # Auth state management
│   └── utils.ts            # Utility functions
└── middleware.ts           # Route protection

```

## Setup Instructions

### 1. Prerequisites
- **Bun** (package manager)
- **Firebase Project** with Google Auth enabled
- **Backend API** running (Express.js with REST endpoints)

### 2. Clone and Install

```bash
cd skill-swapp
bun install
```

### 3. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Enable **Google Sign-In** in Authentication > Sign-in method
4. Get your Firebase config from Project Settings

### 4. Environment Variables

Create `.env.local` in the root directory:

```bash
cp .env.local.example .env.local
```

Fill in your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### 5. Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## Authentication Flow

1. User clicks "Continue with Google" on login page
2. Firebase popup authentication
3. Frontend retrieves Firebase ID token
4. Token sent to backend `POST /auth/login`
5. Backend verifies token and returns JWT
6. JWT stored in localStorage
7. All API calls use JWT in Authorization header

## API Endpoints (Backend)

The frontend expects these REST endpoints:

### Auth
- `POST /auth/login` - Exchange Firebase token for JWT

### Skills
- `GET /skills` - List all skills (with optional query params)
- `GET /skills/:id` - Get skill details
- `POST /skills` - Create new skill
- `GET /skills/my` - Get user's skills
- `PUT /skills/:id` - Update skill
- `DELETE /skills/:id` - Delete skill

### Requests
- `GET /requests` - Get incoming/outgoing requests
- `POST /requests` - Create new request
- `PUT /requests/:id` - Update request status

### Users
- `GET /users/:id` - Get user profile
- `PUT /users/profile` - Update own profile

### Ratings
- `POST /ratings` - Create rating
- `GET /ratings/user/:id` - Get user ratings

## Available Scripts

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
```

## Component Library

All UI components use **shadcn/ui**:
- Button
- Card
- Input
- Textarea
- Badge
- Dialog
- Dropdown Menu
- Avatar
- Tabs
- Select

## Route Protection

Routes are protected using Next.js middleware:

**Protected Routes** (require authentication):
- `/dashboard`
- `/skills/*`
- `/requests`
- `/profile/*`
- `/session/*`

**Public Routes**:
- `/login`

Middleware automatically redirects:
- Unauthenticated users → `/login`
- Authenticated users on `/login` → `/dashboard`

## Known Limitations

- ⚠️ **Video Sessions**: UI-only implementation, no WebRTC logic yet
- ⚠️ **Email/Password Auth**: Not implemented (Google Sign-In only)
- ⚠️ **Real-time Updates**: No WebSocket support yet

## Future Enhancements

- [ ] WebRTC video/audio implementation
- [ ] Real-time notifications
- [ ] Chat messaging
- [ ] Advanced search filters
- [ ] Skill recommendations
- [ ] Calendar integration
- [ ] Mobile app (React Native)

## Security Best Practices

✅ Environment variables for sensitive data  
✅ Firebase tokens never exposed  
✅ Backend JWT validation  
✅ Protected routes with middleware  
✅ HTTPS in production  
✅ Input validation on forms

## Contributing

This is a startup-style production project. Code quality standards:
- TypeScript strict mode
- ESLint compliance
- Component reusability
- Clean, readable code
- Proper error handling

## License

Private - All Rights Reserved

---

**Built with ❤️ using Next.js and Firebase**

