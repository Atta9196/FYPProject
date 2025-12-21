# Testing Realtime Voice Conversation

## ✅ Implementation Checklist

### What's Implemented:
1. ✅ `input_audio_buffer.start` - Sent when audio capture begins
2. ✅ Audio chunks sent via data channel as binary PCM data
3. ✅ `input_audio_buffer.commit` - Sent when stopping (optional)
4. ✅ Silence timeout set to 4000ms (4 seconds)
5. ✅ Audio playback button for browser autoplay restrictions
6. ✅ Audio capture pipeline with AudioContext
7. ✅ PCM 16-bit audio format conversion

## 🚀 Testing Steps

### 1. Start the Server

```powershell
cd E:\IeltsCoach\IeltsWeb\server
npm install  # If dependencies not installed
npm start
```

**Expected Output:**
- Server should start on port 5000 (or configured port)
- Should see: `✅ OpenAI API Key configured`
- Should see: `Server running on port...`

### 2. Start the Client

```powershell
cd E:\IeltsCoach\IeltsWeb\client
npm install  # If dependencies not installed
npm run dev
```

**Expected Output:**
- Vite dev server should start
- Usually runs on `http://localhost:5173` or similar

### 3. Open Browser and Test

1. **Open the app** in Chrome/Edge (HTTPS or localhost)
   - Navigate to the speaking practice page
   - Open Developer Tools (F12)

2. **Check Console Logs** - Look for these key messages:

   **On Connection:**
   ```
   ✅ Data channel opened for text messages
   ✅ Sent session update with turn detection settings
   ✅ Sent Part 1 start request
   ✅ Started sending audio to OpenAI via data channel
   ✅ Audio capture pipeline set up - ready to send audio chunks
   ```

   **When Speaking:**
   ```
   🎤 User started speaking
   📝 Partial user transcription: [your words]
   ✅ Complete user transcription: [your words]
   ```

   **When AI Responds:**
   ```
   📝 AI text delta: [AI response]
   ✅ AI response completed: [full response]
   ▶️ AI audio started playing
   ```

3. **Test Audio Flow:**

   **Step 1: Start Session**
   - Click "Start Voice Conversation"
   - Allow microphone permission if prompted
   - Should see: "✅ Connected via Realtime API"

   **Step 2: Check Audio Sending**
   - Look for: `✅ Started sending audio to OpenAI via data channel`
   - Speak into microphone
   - Check console for continuous audio chunk sending (no errors)

   **Step 3: Test Conversation**
   - AI should ask first question
   - Speak your answer (wait for AI to finish speaking)
   - AI should respond to what you said (not generic response)
   - Should wait 4 seconds of silence before responding

   **Step 4: Audio Playback**
   - If audio doesn't play automatically, click "🔊 Click to Start Audio" button
   - Should hear AI voice responses

## 🔍 Debugging Checklist

### If Audio Not Sending:

1. **Check Microphone Permission:**
   - Browser address bar → Click lock/info icon
   - Ensure microphone is "Allow"
   - Refresh page if needed

2. **Check Console Errors:**
   - Look for: `❌ Error sending audio chunk`
   - Look for: `⚠️ Data channel not open`
   - Look for: `❌ Error starting audio capture`

3. **Verify Variables:**
   ```javascript
   // In browser console, check:
   console.log('isCapturingAudio:', isCapturingAudio);
   console.log('dataChannel readyState:', dataChannel?.readyState);
   ```

4. **Check Audio Context:**
   - Look for: `✅ Audio capture pipeline set up`
   - If missing, check for AudioContext errors

### If AI Not Responding:

1. **Check Backend Logs:**
   - Look for: `response.audio.delta` events
   - Should see continuous audio data from AI

2. **Check Silence Detection:**
   - Speak clearly and wait 4 seconds of silence
   - AI should respond after silence

3. **Check Turn Detection:**
   - Server config: `silence_duration_ms: 4000`
   - Should wait 4 seconds before responding

### If Multiple Questions Fired:

1. **Check Audio Sending:**
   - OpenAI sees silence → thinks user finished → asks next question
   - Verify audio chunks are being sent (check console)

2. **Check `input_audio_buffer.start`:**
   - Should see: `✅ Started sending audio to OpenAI via data channel`
   - If missing, audio won't be sent

## 📊 Expected Console Flow

### Successful Connection:
```
🎙️ Creating Realtime API session...
✅ Realtime session created: [session-id]
✅ Data channel created
✅ Data channel opened for text messages
✅ Sent session update with turn detection settings
✅ Sent Part 1 start request
✅ Started sending audio to OpenAI via data channel
✅ Microphone access granted for Realtime API
✅ Audio capture pipeline set up - ready to send audio chunks
✅ WebRTC connection fully established
```

### During Conversation:
```
🎤 User started speaking
📝 Partial user transcription: "Hello..."
📝 Partial user transcription: "Hello, I am..."
✅ Complete user transcription: "Hello, I am a student"
📝 AI text delta: "That's great! "
📝 AI text delta: "What are you studying?"
✅ AI response completed: "That's great! What are you studying?"
▶️ AI audio started playing
```

## 🐛 Common Issues

### Issue: "Browser autoplay policy blocked audio"
**Solution:** Click the "🔊 Click to Start Audio" button

### Issue: "Data channel not open"
**Solution:** Wait for connection to establish, check WebRTC connection state

### Issue: "No audio chunks being sent"
**Solution:** 
- Check `isCapturingAudio` is `true`
- Check `dataChannel.readyState === 'open'`
- Verify microphone is working (test in other apps)

### Issue: "AI asks multiple questions immediately"
**Solution:**
- Verify `input_audio_buffer.start` was sent
- Check audio chunks are being sent (console should show continuous data)
- Increase `silence_duration_ms` if needed

## ✅ Success Criteria

1. ✅ Microphone captures audio
2. ✅ Audio chunks sent to OpenAI via data channel
3. ✅ AI receives and transcribes user speech
4. ✅ AI responds to specific content (not generic)
5. ✅ AI waits 4 seconds of silence before responding
6. ✅ AI audio plays back correctly
7. ✅ Conversation flows naturally

## 📝 Notes

- **HTTPS Required:** WebRTC needs secure context (HTTPS or localhost)
- **Browser Support:** Chrome/Edge recommended, Firefox should work
- **Microphone:** Must be allowed in browser permissions
- **Network:** Requires stable internet connection for WebRTC
