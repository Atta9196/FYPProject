# Realtime Voice Conversation - Test & Verification Guide

## ✅ Fixes Applied

### 1. **Input Transcription (User Speech)**
- ✅ Fixed event type handling for user input transcription
- ✅ Added support for `input_audio_transcription.completed` event
- ✅ Improved partial vs complete transcription detection
- ✅ Enhanced logging for debugging transcription events

### 2. **Output Audio (AI Response)**
- ✅ Improved audio track handling and playback
- ✅ Added better track state monitoring
- ✅ Enhanced audio playback retry logic
- ✅ Fixed duplicate track detection
- ✅ Added proper audio element event handlers

### 3. **Output Text (AI Response)**
- ✅ Fixed handling of `response.audio_transcript.delta` and `response.audio_transcript.done`
- ✅ Improved text delta extraction from various event formats
- ✅ Added support for multiple response text event types

### 4. **Microphone Input**
- ✅ Enhanced microphone track logging
- ✅ Added sender verification after adding tracks
- ✅ Improved track state monitoring
- ✅ Added detailed logging for debugging audio input

## 🧪 Testing Checklist

### Test 1: Connection & Session Creation
1. Open browser console (F12)
2. Start a voice conversation session
3. **Expected logs:**
   - `✅ Realtime session created: [session-id]`
   - `✅ client_secret.value found: [token]...`
   - `✅ WebRTC connection fully established`
   - `✅ Microphone access granted for Realtime API`
   - `✅ Microphone track added successfully`

### Test 2: Input (User Speaking)
1. Speak into microphone
2. **Expected logs:**
   - `📝 Real-time transcription update: { transcript: "...", isPartial: true/false }`
   - `📝 Real-time transcription: [your words]`
3. **Expected UI:**
   - Real-time transcript appears as you speak
   - Transcript updates in real-time (partial)
   - Final transcript appears when you stop speaking

### Test 3: Output Audio (AI Speaking)
1. Wait for AI to respond
2. **Expected logs:**
   - `🎵 Received remote audio track from AI`
   - `✅ Added audio track to remote stream`
   - `✅ AI audio started playing successfully`
   - `▶️ AI audio playing`
3. **Expected behavior:**
   - You should HEAR the AI speaking
   - Audio plays automatically (or after user interaction if autoplay blocked)

### Test 4: Output Text (AI Response)
1. Wait for AI to respond
2. **Expected logs:**
   - `📝 AI text delta: [partial text]` (as AI generates)
   - `✅ AI response completed: [full text]`
   - OR `🎤 AI audio transcript delta: [what AI said]`
   - OR `✅ AI audio transcript done: [full transcript]`
3. **Expected UI:**
   - AI response text appears in conversation history
   - Text streams in real-time as AI generates it

### Test 5: Full Conversation Flow
1. Start session → AI greets you (audio + text)
2. Speak your response → See your transcript appear
3. AI responds → Hear audio + see text
4. Continue conversation → Repeat steps 2-3

## 🔍 Debugging Tips

### If Input Not Working:
- Check browser console for microphone permission errors
- Verify `🎤 Adding microphone track` logs appear
- Check `📤 Total senders in peer connection: 1` (should be at least 1)
- Verify track state: `readyState: 'live'` and `enabled: true`

### If Output Audio Not Working:
- Check `🎵 Received remote audio track from AI` log
- Verify `✅ Added audio track to remote stream` appears
- Check if autoplay is blocked (browser may require user interaction)
- Look for `⚠️ Autoplay prevented` warning - click anywhere to enable
- Verify audio element: `remoteAudioEl.readyState >= 2`

### If Transcription Not Working:
- Check for `📝 Real-time transcription update` logs
- Verify event types in console: `📨 Realtime event from AI:`
- Check if events have `transcript` or `input_audio_transcript` fields

### If Text Not Appearing:
- Check for `📝 AI text delta` or `✅ AI response completed` logs
- Verify `onAgentMessage` callback is being called
- Check conversation history state updates

## 📊 Key Logs to Monitor

### Successful Connection:
```
✅ Realtime session created: [id]
✅ client_secret.value found: [token]
✅ WebRTC connection fully established
✅ Microphone access granted
✅ Microphone track added successfully
📤 Total senders in peer connection: 1
```

### Successful Input:
```
📝 Real-time transcription update: { transcript: "...", isPartial: true }
📝 Real-time transcription: [your words]
```

### Successful Output:
```
🎵 Received remote audio track from AI
✅ Added audio track to remote stream
✅ AI audio started playing successfully
📝 AI text delta: [text]
✅ AI response completed: [full text]
```

## 🚨 Common Issues & Solutions

1. **"Autoplay prevented"**
   - **Solution:** Click anywhere on the page to enable audio playback

2. **"Microphone track ended unexpectedly"**
   - **Solution:** Check microphone permissions, ensure mic is not being used by another app

3. **"No audio tracks found"**
   - **Solution:** Grant microphone permissions, check browser settings

4. **"WebRTC connection failed"**
   - **Solution:** Check internet connection, firewall settings, try different network

5. **"client_secret.value not found"**
   - **Solution:** Check server logs, verify OPENAI_API_KEY is set correctly

## 📝 Notes

- All improvements maintain backward compatibility
- Enhanced logging helps identify issues quickly
- Audio playback may require user interaction due to browser autoplay policies
- WebRTC requires stable internet connection for best results
