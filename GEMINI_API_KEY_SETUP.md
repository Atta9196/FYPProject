# Gemini API Key Setup Guide

## Where to Add the API Key

The Gemini API key should be added to the **server's `.env` file** located at:
```
IeltsWeb/server/.env
```

## Environment Variable Names

The code checks for **either** of these environment variable names (in order of priority):
1. `GEMINI_API_KEY` (preferred)
2. `GOOGLE_API_KEY` (fallback)

## How to Add the API Key

1. **Create or edit** the `.env` file in `IeltsWeb/server/` directory
2. **Add** one of these lines:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
   OR
   ```env
   GOOGLE_API_KEY=your_api_key_here
   ```

3. **Replace** `your_api_key_here` with your actual Gemini API key from Google AI Studio

## Example `.env` File

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Gemini API Key for Chatbot
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Other environment variables...
```

## How It Works

### Architecture:
1. **Client (Web/Mobile)** → Calls server endpoint `/api/chatbot/message`
2. **Server** → Reads API key from `.env` file (`process.env.GEMINI_API_KEY`)
3. **Server** → Makes request to Gemini API with the API key
4. **Server** → Returns response to client

### Code Location:
- **Server Route**: `IeltsWeb/server/src/routes/chatbotRoutes.js` (line 18)
- **Client Service (Web)**: `IeltsWeb/client/src/services/geminiService.js` (calls server)
- **Client Service (Mobile)**: `Ielts-app/client/src/services/geminiService.js` (calls server)

## Important Notes

1. **Never commit the `.env` file** to Git (it should be in `.gitignore`)
2. **The API key is stored server-side only** - clients never see or use it directly
3. **Both web and mobile apps** use the same server endpoint, so they share the same API key configuration
4. **The server checks** for the API key on every request and logs helpful error messages if it's missing

## Verification

After adding the API key:
1. Restart your server (`node src/index.js` or `npm start`)
2. Check server logs - you should see:
   ```
   🔑 Checking Gemini API key...
      GEMINI_API_KEY exists: true
      API key found: true
      API key prefix: AIzaSyXXXX...
      API key length: 39
   ```
3. Try sending a message in the chatbot - it should work!

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key
5. Add it to your `IeltsWeb/server/.env` file

## Troubleshooting

If you see errors:
- **"Gemini API key not configured"**: Check that the `.env` file exists and has the correct variable name
- **"403 Forbidden"**: Your API key might be invalid or restricted
- **"429 Quota Exceeded"**: You've hit the free tier limit, wait or enable billing

