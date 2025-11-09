# 🔧 Troubleshooting Realtime API Connection Issues

## Error: "Failed to get realtime token"

This error means the client cannot get the `client_secret` from the server. Here's how to diagnose and fix it:

## 🔍 Step 1: Check Server Logs

When you start the server and try to connect, you should see logs like:

```
🎙️ Creating Realtime API session...
✅ Realtime session created: sess_xxxxx
📋 Session object keys: [...]
🔑 client_secret exists: true/false
```

**What to look for:**
- ✅ If `client_secret exists: true` → The server is working correctly
- ❌ If `client_secret exists: false` → The OpenAI API response format might be different

## 🔍 Step 2: Check Browser Console

Open your browser's Developer Console (F12) and look for:

```
📋 Session response keys: [...]
🔑 client_secret exists: true/false
📋 Full session object: {...}
```

**What to look for:**
- Check if `client_secret` exists in the session object
- Check the full session object structure

## ✅ Step 3: Verify Environment Variables

### Server `.env` file (`IeltsCoach/server/.env`)

Make sure you have:
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=5000
```

**Important:** 
- The API key must start with `sk-`
- No quotes around the API key
- No spaces before/after the `=`

### Client `.env` file (`IeltsCoach/client/.env`)

Make sure you have:
```env
VITE_SERVER_URL=http://localhost:5000
```

## 🔍 Step 4: Test Server Endpoint Directly

Open your browser and go to:
```
http://localhost:5000/health
```

You should see:
```json
{
  "status": "ok",
  "env": {
    "jwtSecret": true,
    "firebaseWebApiKey": true,
    "firebaseAdmin": {
      "projectId": true,
      "clientEmail": true,
      "privateKey": true
    }
  }
}
```

**Note:** `OPENAI_API_KEY` is not shown in health check for security, but check server logs.

## 🔍 Step 5: Test API Endpoint

Try calling the endpoint directly:

```bash
curl -X POST http://localhost:5000/api/voice/session \
  -H "Content-Type: application/json"
```

Or use Postman/Thunder Client to test the endpoint.

**Expected response:**
```json
{
  "id": "sess_xxxxx",
  "client_secret": "sk-xxxxx",
  "success": true,
  "message": "Session created successfully"
}
```

## 🐛 Common Issues & Solutions

### Issue 1: "OPENAI_API_KEY not configured"
**Solution:** 
- Check that `.env` file exists in `IeltsCoach/server/`
- Check that `OPENAI_API_KEY` is set correctly
- Restart the server after changing `.env`

### Issue 2: "client_secret not found in session response"
**Possible causes:**
1. OpenAI API key is invalid or expired
2. OpenAI API response format changed
3. Network/CORS issues

**Solutions:**
1. Verify your OpenAI API key is valid
2. Check server logs for the full session object
3. Try the fallback endpoint: `/api/auth/realtime-token`

### Issue 3: "Error accessing microphone"
**Solution:**
1. **Chrome/Edge:**
   - Click the lock icon in address bar
   - Set "Microphone" to "Allow"
   - Reload the page

2. **System Settings (Windows):**
   - Settings → Privacy → Microphone
   - Enable "Allow apps to access your microphone"
   - Enable for your browser

3. **System Settings (Mac):**
   - System Preferences → Security & Privacy → Privacy → Microphone
   - Enable for your browser

4. **Close other apps** using the microphone (Zoom, Teams, etc.)

## 🔄 Automatic Fallback

The code now automatically falls back to Socket.io mode if Realtime API fails. You should see:

```
⚠️ Realtime API failed, falling back to Socket.io mode
⚠️ Realtime API unavailable. Using Socket.io mode instead...
```

Then it will continue with Socket.io mode, which should work.

## 📋 Debug Checklist

- [ ] Server is running on port 5000
- [ ] `OPENAI_API_KEY` is set in server `.env`
- [ ] Server logs show session creation
- [ ] Browser console shows session response
- [ ] Microphone permissions are granted
- [ ] No other apps using microphone
- [ ] CORS is configured correctly
- [ ] Network connection is stable

## 🆘 Still Not Working?

1. **Check server logs** for detailed error messages
2. **Check browser console** for client-side errors
3. **Try Socket.io fallback mode** by setting `VITE_USE_OPENAI_REALTIME=false` in client `.env`
4. **Test with curl/Postman** to isolate the issue
5. **Check OpenAI API status** at https://status.openai.com

## 📞 Getting Help

When asking for help, provide:
1. Server logs (especially around session creation)
2. Browser console errors
3. Your `.env` file structure (without actual keys)
4. Steps you've already tried

