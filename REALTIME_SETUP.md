# Enabling Supabase Realtime for Bulletin Board

If posts don't appear instantly (you need to refresh the page), you need to enable Realtime on your `posts` table in Supabase.

## Steps to Enable Realtime:

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Select your project
3. In the left sidebar, click **Database**
4. Click **Replication** (in the Database submenu)
5. Find the `posts` table in the list
6. Toggle the switch next to `posts` to **enable** Realtime
7. Wait a few seconds for it to apply

## How to Test:

1. Open your app in two different browser tabs or windows
2. Post a photo in one tab
3. The photo should appear instantly in the other tab without refreshing
4. Check the browser console for these messages:
   - `Realtime subscription status: SUBSCRIBED` (means it's working)
   - `New post received: {...}` (when someone posts)
   - `Post deleted: {...}` (when someone deletes)

## Troubleshooting:

### If you see "Realtime subscription status: CLOSED" or errors:
- Make sure Realtime is enabled for the `posts` table (step 6 above)
- Check that your Supabase project is not paused (free tier projects pause after inactivity)
- Verify your RLS policies allow public SELECT on the `posts` table

### If posts still don't appear instantly:
- Check the browser console for any errors
- Make sure you're not hitting rate limits
- Try creating a new channel with a different name

### Posts appear but delete doesn't work instantly:
- Make sure Realtime is listening to DELETE events (already configured in the code)
- Check browser console for "Post deleted" messages

## Note:
The console.log statements I added will help you debug. Once everything is working, you can remove them if you want cleaner logs.
