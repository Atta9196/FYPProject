# Voice Conversation Testing Guide

## ✅ System Status
- **Server**: Running on port 5000 ✅
- **Client**: Running on port 5173 ✅
- **Route**: `/speaking` → Select "Voice Conversation" mode

## 🧪 Testing Steps

### 1. Access the Application
1. Open your browser and go to: `http://localhost:5173`
2. Login if needed
3. Navigate to: **Speaking Practice** (`/speaking`)
4. Select: **Voice Conversation** mode (🎙️)

### 2. Start Voice Session
1. Click **"Start Voice Conversation"** button
2. Allow microphone access when prompted
3. Wait for connection status to show: **"✅ Connected to voice server"**
4. Wait for AI greeting (should play automatically)

### 3. Test Real-Time Voice
1. **Speak naturally** - The system will detect your voice automatically
2. **Watch for indicators**:
   - "🎤 Voice Detected - Recording..." should appear when you speak
   - "🔇 Waiting for voice..." when silent
3. **Stop speaking** - Wait ~1 second after you finish
4. **AI should respond** within 2-3 seconds with voice

### 4. Check Browser Console (F12)
Look for these logs:
- ✅ `📤 Sending streaming audio chunk immediately...`
- ✅ `📦 Accumulated X chunks` (server)
- ✅ `🎵 Processing X accumulated chunks` (server)
- ✅ `📝 User said (streaming): [your speech]` (server)
- ✅ `✅ Response sent successfully` (server)
- ✅ `🎙️ Voice response received:` (client)

### 5. Check Server Logs
In the server terminal, you should see:
- ✅ `🎵 Received streaming audio chunk...`
- ✅ `📦 Accumulated X chunks for session [sessionId]`
- ✅ `🎵 Processing X accumulated chunks`
- ✅ `📝 Transcribing audio...`
- ✅ `📝 User said (streaming): [transcription]`
- ✅ `🤖 Generating AI response...`
- ✅ `✅ AI response generated: [response]`
- ✅ `📤 Sending response to client...`
- ✅ `✅ Response sent successfully`

## 🐛 Troubleshooting

### If No Response After Speaking:
1. **Check Connection Status**:
   - Should show "✅ Connected to voice server"
   - If shows "⚠️ Connection issue", check server logs

2. **Check Browser Console**:
   - Look for errors (red messages)
   - Check if audio chunks are being sent
   - Check if responses are being received

3. **Check Server Logs**:
   - Look for "🎵 Received streaming audio chunk"
   - Check if chunks are being accumulated
   - Check if processing is happening

4. **Check Microphone**:
   - Ensure microphone is not muted
   - Check browser/system microphone permissions
   - Try speaking louder

### If Timeout Error:
- The system has a 15-second timeout
- If you see "⚠️ No response from server", check:
  - Server is running
  - Server logs for errors
  - Network connection

### If Audio Not Playing:
- Check browser autoplay settings
- Click on the page to enable audio
- Check browser console for audio errors

## 📊 Expected Behavior

### Normal Flow:
1. **Start Session** → Connection established
2. **AI Greets** → Voice plays automatically
3. **You Speak** → "Voice Detected - Recording..." appears
4. **You Stop** → After ~1 second, recording stops
5. **AI Responds** → Voice response plays within 2-3 seconds
6. **Repeat** → Conversation continues automatically

### Response Time:
- **Silence Detection**: ~0.2-0.3 seconds after you stop speaking
- **Processing**: ~1-2 seconds (transcription + AI response)
- **Total**: ~2-3 seconds from when you stop speaking

## ✅ Success Criteria

The system is working correctly if:
- ✅ Connection status shows "Connected"
- ✅ AI greeting plays automatically
- ✅ Voice detection works (shows "Voice Detected" when speaking)
- ✅ Recording stops automatically after silence
- ✅ AI responds within 2-3 seconds
- ✅ Voice response plays automatically
- ✅ Conversation continues naturally

## 🔧 Quick Fixes

### If Server Not Responding:
```bash
cd IeltsCoach/server
npm start
```

### If Client Not Running:
```bash
cd IeltsCoach/client
npm run dev
```

### If Port 5000 Busy:
```powershell
netstat -ano | findstr :5000
taskkill /PID [PID] /F
```

