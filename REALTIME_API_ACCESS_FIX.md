# Realtime API Access Issue - Fix Guide

## 🔍 Problem Identified

Your API key works for other OpenAI endpoints but **fails for Realtime API** with 401 error.

**Root Cause:** API key doesn't have Realtime API access/permissions.

## ✅ Solutions (Try in Order)

### Solution 1: Check API Key Permissions

1. Visit: https://platform.openai.com/account/api-keys
2. Find your API key
3. Click **Edit** (pencil icon)
4. Check permissions:
   - **"All"** → Should work, but Realtime API may need beta access
   - **"Restricted"** → Add Realtime API with "Write" permission

### Solution 2: Request Beta Access

Realtime API may require beta enrollment:

1. Check: https://platform.openai.com/docs/guides/realtime
2. Look for "Request Access" or "Beta Program" links
3. Contact OpenAI support if needed
4. Mention you need Realtime API access

### Solution 3: Use Alternative Model

I've updated the code to try `gpt-4o-mini-realtime-preview-2024-12-17` which may have different access requirements.

**To switch back to full model:**
- Edit `voiceRoutes.js` line 36
- Change to: `"gpt-4o-realtime-preview-2024-12-17"`

### Solution 4: Verify API Key Format

Ensure your API key:
- Starts with `sk-`
- Is the full key (not truncated)
- Is copied correctly (no extra spaces)

## 🧪 Test After Fix

Run the test script:
```powershell
cd E:\IeltsCoach\IeltsWeb\server
node test-realtime-api.js
```

**Expected Success Output:**
```
✅ SUCCESS! Realtime session created:
   Session ID: sess_...
   Client Secret: Present
```

## 📝 Notes

- Realtime API is newer and may require special access
- Some accounts may need to request beta access
- The API key works for other endpoints, so it's specifically a Realtime API permission issue
- Once access is granted, the implementation should work immediately

## 🔗 Useful Links

- API Keys: https://platform.openai.com/account/api-keys
- Realtime API Docs: https://platform.openai.com/docs/guides/realtime
- OpenAI Support: https://help.openai.com/
