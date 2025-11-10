# 🔍 OpenAI API Diagnostics Guide

## Problem: No Tokens Being Used

If your OpenAI dashboard shows $0.00 spend and 0 tokens, it means the API calls are either:
1. Not being made (API key not configured)
2. Failing silently (using fallback responses)
3. API key is invalid or expired

## ✅ Step 1: Check Your .env File

1. Navigate to `IeltsCoach/server/` directory
2. Check if `.env` file exists
3. Open the `.env` file and verify you have:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important:**
- The API key must start with `sk-`
- No quotes around the API key
- No spaces before/after the `=`
- Make sure there are no extra characters

## ✅ Step 2: Restart Your Server

After setting/updating the `.env` file, **you must restart your server** for changes to take effect.

```bash
# Stop the server (Ctrl+C)
# Then restart it
cd IeltsCoach/server
npm run dev
```

## ✅ Step 3: Check Server Startup Logs

When you start the server, you should see:

```
✅ OpenAI API Key configured
🔑 API Key prefix: sk-proj...
OPENAI_API_KEY set: true
```

If you see:
```
❌ WARNING: OPENAI_API_KEY is not set in environment variables!
```

Then your `.env` file is not being loaded correctly.

## ✅ Step 4: Test the API Key

I've added a test endpoint to verify your API key works:

1. **Open your browser** and go to:
   ```
   http://localhost:5000/test-openai
   ```

2. **Expected Success Response:**
   ```json
   {
     "success": true,
     "message": "Hello, API test successful!",
     "usage": {
       "prompt_tokens": 15,
       "completion_tokens": 8,
       "total_tokens": 23
     },
     "apiKeyConfigured": true,
     "apiKeyPrefix": "sk-proj..."
   }
   ```

3. **If it fails**, you'll see error details:
   ```json
   {
     "success": false,
     "error": "OpenAI API test failed",
     "message": "...",
     "details": {
       "status": 401,
       "code": "invalid_api_key"
     }
   }
   ```

## ✅ Step 5: Check Health Endpoint

Visit: `http://localhost:5000/health`

You should see:
```json
{
  "status": "ok",
  "env": {
    "openaiApiKey": true,
    "openaiApiKeyPrefix": "sk-proj..."
  }
}
```

## ✅ Step 6: Check Server Logs During Usage

When you use the app, watch your server console. You should see:

**✅ If API is working:**
```
🔄 Starting streaming AI response...
✅ Streaming complete. Full message: ...
📊 Usage: { "prompt_tokens": ..., "completion_tokens": ..., "total_tokens": ... }
```

**❌ If API is failing:**
```
❌ OpenAI API failed for continue conversation!
❌ Error details: {
  "message": "Incorrect API key provided",
  "status": 401,
  "code": "invalid_api_key"
}
⚠️ Using enhanced fallback response
```

## 🐛 Common Issues & Solutions

### Issue 1: "OPENAI_API_KEY not configured"
**Solution:**
- Check that `.env` file exists in `IeltsCoach/server/` directory
- Check that the file is named exactly `.env` (not `.env.txt` or `.env.example`)
- Make sure the line is: `OPENAI_API_KEY=sk-your-key-here`
- Restart the server after making changes

### Issue 2: "invalid_api_key" error
**Possible causes:**
- API key is incorrect or expired
- API key has extra spaces or quotes
- API key doesn't start with `sk-`

**Solution:**
- Get a new API key from https://platform.openai.com/api-keys
- Copy it exactly (no extra spaces)
- Update `.env` file
- Restart server

### Issue 3: API calls failing silently
**What's happening:**
- The code has fallback responses that activate when API fails
- This means you get responses, but they're not from OpenAI
- Check server logs for error messages

**Solution:**
- Check server logs for `❌ OpenAI API failed` messages
- Fix the API key issue
- The app will automatically use OpenAI once the key works

### Issue 4: API key works in test but not in app
**Possible causes:**
- Different environment variables in different contexts
- Server not restarted after setting API key
- API key set in wrong `.env` file location

**Solution:**
- Make sure `.env` is in `IeltsCoach/server/` directory
- Restart the server completely
- Check server startup logs to confirm API key is loaded

## 📊 How to Verify Tokens Are Being Used

1. **Check OpenAI Dashboard:**
   - Go to https://platform.openai.com/usage
   - You should see token usage increasing after making requests

2. **Check Server Logs:**
   - Look for `📊 Usage:` logs after API calls
   - These show token counts for each request

3. **Test Endpoint:**
   - Call `/test-openai` endpoint
   - Check the `usage` field in the response
   - Verify tokens appear in your dashboard

## 🔄 Next Steps

1. ✅ Set `OPENAI_API_KEY` in `.env` file
2. ✅ Restart server
3. ✅ Test with `/test-openai` endpoint
4. ✅ Check server logs during app usage
5. ✅ Verify tokens appear in OpenAI dashboard

If you're still having issues after following these steps, check the server logs for specific error messages and share them for further troubleshooting.

