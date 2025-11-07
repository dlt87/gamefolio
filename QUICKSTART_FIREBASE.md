# 🚀 Quick Start: Firebase Bulletin Board

## What Changed?

✅ **Firebase installed** - Photos now stored in the cloud  
✅ **Real-time updates** - Everyone sees new posts instantly  
✅ **Global bulletin board** - Photos visible to all visitors  
✅ **Persistent storage** - Photos survive page refreshes  

## Next Steps (5 minutes)

### 1. Create Firebase Project
Go to https://console.firebase.google.com/ → Create project

### 2. Enable Services
- **Firestore Database**: Start in test mode
- **Storage**: Start in test mode

### 3. Get Your Config
Project Settings → Your apps → Web → Copy firebaseConfig

### 4. Update Config File
**Option A:** Direct (faster for testing)
Edit `src/firebase/config.ts` and paste your config

**Option B:** Environment variables (better for production)
1. Copy `.env.example` to `.env`
2. Fill in your Firebase values
3. Restart dev server

### 5. Set Security Rules

**Firestore Rules** (Rules tab):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bulletin-posts/{postId} {
      allow read, create, delete: if true;
    }
  }
}
```

**Storage Rules** (Rules tab):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /bulletin-posts/{imageId} {
      allow read, create, delete: if true;
    }
  }
}
```

### 6. Test It!
```bash
npm run dev
```

Walk to the Bulletin Board zone, take a selfie, and watch it appear for everyone! 📸

---

## Troubleshooting

**Build error?** Make sure Firebase config has valid values (not "YOUR_API_KEY")

**Can't post?** Check Firebase console rules are published

**Photos not loading?** Verify Storage is enabled

---

📖 **Full guide:** See `FIREBASE_SETUP.md` for detailed instructions
