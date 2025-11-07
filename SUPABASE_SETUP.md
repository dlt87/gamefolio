# Supabase Setup Guide

Your bulletin board now uses Supabase instead of Firebase! Follow these steps to get it working.

## 1. Create a Supabase Project

1. Go to https://app.supabase.com/
2. Sign in with your GitHub account or email
3. Click "New project"
4. Enter:
   - **Name**: gamefolio (or whatever you prefer)
   - **Database Password**: Choose a strong password (save it somewhere safe!)
   - **Region**: Choose the closest region to you or your users
5. Click "Create new project" and wait for it to initialize (~2 minutes)

## 2. Get Your API Keys

1. In your Supabase project dashboard, go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. You'll see:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. Copy these values — you'll need them in step 5

## 3. Create the Posts Table

1. In the left sidebar, click **Table Editor**
2. Click **"New table"**
3. Configure the table:
   - **Name**: `posts`
   - **Description**: Bulletin board posts (optional)
   - Enable **"Enable Row Level Security (RLS)"** for now (we'll configure it later)
4. Add these columns (some are added automatically):
   - `id` (uuid, default: `uuid_generate_v4()`, primary key) — **auto-created**
   - `created_at` (timestamptz, default: `now()`) — **auto-created**
   - `image_url` (text, not nullable)
   - `caption` (text, nullable)
5. Click **Save**

## 4. Set Up Storage for Images

1. In the left sidebar, click **Storage**
2. Click **"New bucket"**
3. Configure the bucket:
   - **Name**: `bulletin-images`
   - **Public bucket**: **Yes** (check this box so images are publicly accessible)
4. Click **Create bucket**

## 5. Configure Row Level Security (RLS)

By default, RLS blocks all access. We need to add policies to allow public read/write.

### For the `posts` table:

1. Go to **Authentication** > **Policies** (or **Table Editor** > click on `posts` > **Policies**)
2. Click **"New Policy"** on the `posts` table
3. **Policy 1: Allow public read**
   - Template: Use "Enable read access for all users"
   - Or manually:
     - **Policy name**: Public read access
     - **Allowed operation**: SELECT
     - **Target roles**: `public`
     - **USING expression**: `true`
4. Click **Review** > **Save policy**
5. **Policy 2: Allow public insert**
   - Click **"New Policy"** again
   - Template: Use "Enable insert for all users"
   - Or manually:
     - **Policy name**: Public insert access
     - **Allowed operation**: INSERT
     - **Target roles**: `public`
     - **WITH CHECK expression**: `true`
6. Click **Review** > **Save policy**
7. **Policy 3: Allow public delete**
   - Click **"New Policy"** again
   - **Policy name**: Public delete access
   - **Allowed operation**: DELETE
   - **Target roles**: `public`
   - **USING expression**: `true`
8. Click **Review** > **Save policy**

### For the `bulletin-images` storage bucket:

1. Go to **Storage** > click on `bulletin-images` bucket
2. Click **Policies** tab
3. Click **"New Policy"**
4. **Policy 1: Allow public upload**
   - **Policy name**: Public upload
   - **Allowed operation**: INSERT
   - **Target roles**: `public`
   - **Policy definition**: `true`
5. Click **Review** > **Save policy**
6. **Policy 2: Allow public read**
   - **Policy name**: Public read
   - **Allowed operation**: SELECT
   - **Target roles**: `public`
   - **Policy definition**: `true`
7. Click **Review** > **Save policy**

> **Note**: These policies allow anyone to read, post, and delete. This is fine for development/demo, but for production you'd want to add authentication and restrict delete access.

## 6. Add Your Supabase Keys to Your Project

1. In your project folder, you should have a `.env` file (if not, copy `.env.example` to `.env`)
2. Open `.env` and add your Supabase keys from step 2:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

3. Save the file

## 7. Restart Your Dev Server

If your Vite dev server is running, restart it so it picks up the new environment variables:

```bash
# Stop the server (Ctrl+C)
# Then start it again:
npm run dev
```

## 8. Test the Bulletin Board!

1. Open your app in the browser
2. Walk into the **Bulletin Board** zone
3. Click "Turn On Camera"
4. Capture a photo
5. Add an optional message
6. Click "Post to Board"
7. Your photo should appear in the bulletin board!
8. Open your app in another browser or device — you should see the same posts!

## Verification Checklist

- [ ] Supabase project created
- [ ] `posts` table created with `id`, `created_at`, `image_url`, `caption`
- [ ] `bulletin-images` storage bucket created and set to public
- [ ] RLS policies added for public read/insert/delete on `posts` table
- [ ] Storage policies added for public upload/read on `bulletin-images` bucket
- [ ] `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Dev server restarted
- [ ] Photos can be posted and viewed globally

## Troubleshooting

### "Failed to upload photo"
- Check that your `.env` file has the correct Supabase URL and anon key
- Make sure you restarted your dev server after adding the keys
- Check the browser console for specific error messages
- Verify that the `bulletin-images` bucket exists and is public

### "Failed to load posts from server"
- Check that the `posts` table exists with the correct columns
- Verify RLS policies are set up (see step 5)
- Check browser console for error details

### Photos not appearing
- Make sure RLS policies allow public SELECT on `posts` table
- Check that real-time subscriptions are enabled (should be by default)
- Open browser console and check for errors

### CORS errors (if deploying to Vercel/Netlify)
- Supabase automatically handles CORS for public buckets
- If you get CORS errors, check that the bucket is set to **public**

## Next Steps (Optional)

- **Add authentication**: Use Supabase Auth to require sign-in before posting
- **Add moderation**: Restrict delete to authenticated users or admins
- **Add image compression**: Resize images before upload to save storage
- **Add pagination**: Load posts in batches for better performance
- **Delete old images**: Set up a background job to clean up deleted posts' images

## Differences from Firebase

- **No billing required**: Supabase free tier includes storage without needing to upgrade
- **SQL database**: Posts are stored in a Postgres database instead of a document store
- **Real-time is built-in**: No extra setup needed for live updates
- **Public by default**: Storage buckets can be public without CORS config

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
