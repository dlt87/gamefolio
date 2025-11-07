# Firebase Setup Guide for Bulletin Board

Your bulletin board is now configured to use Firebase! Follow these steps to complete the setup:

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "gamefolio-bulletin")
4. Disable Google Analytics (optional for this project)
5. Click **"Create project"**

## Step 2: Register Your Web App

1. In your Firebase project, click the **web icon** (`</>`) to add a web app
2. Give it a nickname (e.g., "gamefolio-web")
3. **Don't enable Firebase Hosting** (we'll deploy elsewhere)
4. Click **"Register app"**
5. Copy the `firebaseConfig` object shown

## Step 3: Update Firebase Configuration

1. Open `src/firebase/config.ts`
2. Replace the placeholder values with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 4: Enable Firestore Database

1. In Firebase Console, go to **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select a location closest to your users
5. Click **"Enable"**

### Set Firestore Rules (Important!)

Go to the **"Rules"** tab and replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bulletin-posts/{postId} {
      // Anyone can read posts
      allow read: if true;
      
      // Anyone can create posts
      allow create: if true;
      
      // Only allow deleting your own posts (for now, anyone can delete)
      // TODO: Add authentication to restrict deletes
      allow delete: if true;
    }
  }
}
```

Click **"Publish"** to save the rules.

## Step 5: Enable Firebase Storage

1. In Firebase Console, go to **"Storage"** in the left menu
2. Click **"Get started"**
3. Choose **"Start in test mode"**
4. Click **"Next"** and **"Done"**

### Set Storage Rules

Go to the **"Rules"** tab and replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /bulletin-posts/{imageId} {
      // Anyone can read images
      allow read: if true;
      
      // Anyone can upload images (max 5MB)
      allow create: if request.resource.size < 5 * 1024 * 1024;
      
      // Anyone can delete (for now)
      allow delete: if true;
    }
  }
}
```

Click **"Publish"**.

## Step 6: Test Your App

1. Run your app locally:
   ```bash
   npm run dev
   ```

2. Navigate to the Bulletin Board zone
3. Take a selfie and post it
4. Open the app in another browser/device - you should see the same photos!

## Step 7: Deploy (Optional)

Deploy your app to make it publicly accessible:

### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Option B: Netlify
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

## Security Notes

⚠️ **Current setup is for development/demo purposes**

The current Firestore and Storage rules allow **anyone** to read, write, and delete posts. For production:

1. **Add Firebase Authentication** to identify users
2. **Update rules** to restrict deletes to post owners
3. **Add rate limiting** to prevent spam
4. **Consider moderation** for inappropriate content

### Example Production Rules (with Auth):

```javascript
// Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bulletin-posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && 
                      resource.data.userId == request.auth.uid;
    }
  }
}

// Storage
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /bulletin-posts/{imageId} {
      allow read: if true;
      allow create: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024;
      allow delete: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### "Failed to load posts from server"
- Check that Firestore is enabled
- Verify Firestore rules allow reading
- Check browser console for specific errors

### "Failed to upload photo"
- Check that Storage is enabled
- Verify Storage rules allow uploads
- Ensure image is under 5MB

### "Permission denied"
- Double-check your Firestore and Storage rules
- Make sure you clicked "Publish" after updating rules

## Cost Estimation

Firebase Free Tier (Spark Plan) includes:
- **Firestore**: 50K reads/day, 20K writes/day
- **Storage**: 5GB storage, 1GB/day downloads
- **Bandwidth**: 10GB/month

For a small portfolio site with moderate traffic, the free tier should be sufficient!

---

**Need help?** Check the [Firebase Documentation](https://firebase.google.com/docs)
