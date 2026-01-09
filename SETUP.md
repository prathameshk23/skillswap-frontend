# SkillSwap - Quick Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
bun install
```

### Step 2: Configure Firebase

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Click "Add Project"
   - Follow the setup wizard

2. **Enable Google Authentication**
   - Navigate to: Authentication → Sign-in method
   - Click "Google" → Enable → Save

3. **Get Firebase Config**
   - Go to: Project Settings (⚙️ icon)
   - Scroll to "Your apps" → Web app
   - Copy the config object

### Step 3: Create .env.local

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

# Update this if your backend runs on a different port
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### Step 4: Start Development Server

```bash
bun dev
```

Open http://localhost:3000

---

## 📁 Project Structure Overview

```
app/
├── login/              → Google Sign-In page
├── dashboard/          → Main skill feed (authenticated)
├── skills/
│   ├── create/        → Create new skill offer
│   └── my/            → Manage your skills
├── requests/          → Incoming/outgoing requests
├── profile/[id]/      → User profile pages
└── session/[id]/      → Video session UI

components/
├── navbar.tsx         → Main navigation bar
├── skill-card.tsx     → Reusable skill card
├── request-card.tsx   → Request display component
└── rating-dialog.tsx  → Rating submission modal

lib/
├── firebase.ts        → Firebase config & Google Auth
├── api.ts             → Backend API client (REST)
├── auth-context.tsx   → Auth state management
└── utils.ts           → Helper functions
```

---

## 🔐 Authentication Flow

```
User clicks "Sign in with Google"
        ↓
Firebase Authentication Popup
        ↓
Firebase ID Token Generated
        ↓
Frontend → POST /auth/login (with Firebase token)
        ↓
Backend verifies Firebase token
        ↓
Backend returns JWT token
        ↓
Frontend stores JWT in localStorage
        ↓
All API calls include: Authorization: Bearer <JWT>
```

---

## 🛠️ Common Commands

```bash
# Development
bun dev                 # Start dev server
bun build              # Build for production
bun start              # Run production build

# Code Quality
bun lint               # Run ESLint

# Dependency Management
bun add <package>      # Add dependency
bun remove <package>   # Remove dependency
```

---

## 🧩 Available shadcn/ui Components

Already installed and ready to use:

- `Button` - Various button styles
- `Card` - Content containers
- `Input` - Text input fields
- `Textarea` - Multi-line input
- `Badge` - Status labels
- `Dialog` - Modal dialogs
- `DropdownMenu` - Dropdown menus
- `Avatar` - User avatars
- `Tabs` - Tab navigation
- `Select` - Select dropdowns

**Add more components:**
```bash
bunx shadcn@latest add <component-name>
```

---

## 🔄 Backend API Requirements

Your Express.js backend must implement these endpoints:

**Auth**
- `POST /auth/login` - Verify Firebase token, return JWT

**Skills**
- `GET /skills` - List all skills
- `POST /skills` - Create skill
- `GET /skills/my` - Get user's skills
- `DELETE /skills/:id` - Delete skill

**Requests**
- `GET /requests` - Get user's requests
- `POST /requests` - Create request
- `PUT /requests/:id` - Update request status

**Users**
- `GET /users/:id` - Get user profile
- `PUT /users/profile` - Update profile

**Ratings**
- `POST /ratings` - Submit rating
- `GET /ratings/user/:id` - Get user ratings

---

## 🐛 Troubleshooting

### "Firebase config is undefined"
✅ Check `.env.local` exists and has `NEXT_PUBLIC_` prefix

### "401 Unauthorized" on API calls
✅ Verify backend is running on port 5000  
✅ Check backend accepts Firebase tokens  
✅ Ensure JWT is being set in localStorage

### Components not rendering correctly
✅ Run `bun install` again  
✅ Clear `.next` folder: `rm -rf .next`  
✅ Restart dev server

### "Module not found" errors
✅ Check `tsconfig.json` has correct paths  
✅ Ensure all imports use `@/` alias  
✅ Restart TypeScript server in VS Code

---

## 📱 Testing the App

1. **Login Flow**
   - Visit http://localhost:3000
   - Should redirect to `/login`
   - Click "Continue with Google"
   - Select Google account
   - Should redirect to `/dashboard`

2. **Create a Skill**
   - Click "Create Skill" in navbar
   - Fill in title, category, description
   - Submit → redirects to "My Skills"

3. **Browse Skills**
   - Go to Dashboard
   - Search and filter skills
   - Click "Request" to create a request

4. **Manage Requests**
   - Go to Requests page
   - View incoming/outgoing requests
   - Accept/Reject incoming requests
   - Rate completed exchanges

---

## 🎨 Customization Tips

**Change Primary Color**
Edit `app/globals.css`:
```css
--primary: 220 90% 50%;  /* Adjust hue, saturation, lightness */
```

**Add New Category**
Edit category arrays in:
- `app/dashboard/page.tsx`
- `app/skills/create/page.tsx`

**Modify Navbar Links**
Edit `components/navbar.tsx` → `navItems` array

---

## ✅ Checklist Before Deployment

- [ ] Firebase config added to `.env.local`
- [ ] Backend API is accessible
- [ ] All environment variables set
- [ ] Google Sign-In working
- [ ] API calls returning data
- [ ] No TypeScript errors (`bun build`)
- [ ] No console errors in browser
- [ ] Tested on mobile viewport

---

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

---

**Need Help?** Check the main README.md for detailed documentation.
