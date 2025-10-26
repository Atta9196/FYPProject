# AI Integration Setup Guide

## Overview
This guide explains how to set up the AI-powered IELTS Speaking Practice feature.

## Backend Setup

### 1. Environment Variables
Create a `.env` file in the `server` directory with the following variables:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server Configuration  
PORT=5000

# JWT Configuration (existing)
JWT_SECRET=your-jwt-secret-here

# Firebase Configuration (existing)
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-firebase-private-key\n-----END PRIVATE KEY-----\n"
```

### 2. Dependencies
The following packages have been installed:
- `openai` - For GPT and Whisper API integration
- `multer` - For handling audio file uploads

### 3. API Endpoints

#### GET /api/speaking/question
- Generates a random IELTS Speaking Part 2 question using GPT-4o-mini
- Returns: `{ question: string, success: boolean }`

#### POST /api/speaking/evaluate
- Accepts audio file (WebM format) via multipart/form-data
- Uses Whisper to transcribe the audio
- Uses GPT-4o-mini to evaluate the response
- Returns: `{ transcript: string, feedback: object, success: boolean }`

## Frontend Features

### 1. Automatic Question Loading
- Loads a random AI-generated question when the page loads
- Shows loading state while fetching

### 2. Audio Recording
- Uses MediaRecorder API to record audio
- 2-minute timer with visual countdown
- Automatic stop when timer reaches zero

### 3. AI Evaluation
- Sends recorded audio to backend for processing
- Shows loading state during evaluation
- Displays transcript and detailed feedback

### 4. Feedback Display
- **Transcript**: Shows what the user said
- **Fluency**: Evaluation of speaking pace and flow
- **Pronunciation**: Assessment of clarity and articulation
- **Grammar**: Analysis of grammatical accuracy
- **Coherence**: Evaluation of logical structure
- **Band Score**: Overall IELTS band score (0-9)

## Usage Flow

1. **Page Load**: Automatically fetches a random IELTS question
2. **Record**: User clicks microphone to start recording
3. **Timer**: 2-minute countdown with visual feedback
4. **Stop**: User clicks microphone again or timer expires
5. **Processing**: Audio is sent to backend for AI analysis
6. **Results**: Transcript and detailed feedback are displayed
7. **New Question**: User can get a new question to practice

## Technical Implementation

### Backend (Node.js + Express)
- **OpenAI Integration**: Uses GPT-4o-mini for question generation and evaluation
- **Whisper Integration**: Transcribes audio to text
- **File Handling**: Multer for audio upload processing
- **Error Handling**: Comprehensive error handling and logging

### Frontend (React)
- **MediaRecorder API**: Browser-native audio recording
- **State Management**: React hooks for managing recording and evaluation states
- **UI Feedback**: Loading states, progress indicators, and result display
- **Error Handling**: User-friendly error messages

## Testing

1. Start the backend server: `npm run dev` (in server directory)
2. Start the frontend: `npm run dev` (in client directory)
3. Navigate to the Speaking Practice page
4. Allow microphone permissions when prompted
5. Test the complete flow: question → record → evaluation → feedback

## Troubleshooting

### Common Issues
1. **Microphone Permission**: Ensure browser has microphone access
2. **OpenAI API Key**: Verify the API key is correctly set in .env
3. **CORS Issues**: Backend is configured to allow frontend requests
4. **Audio Format**: Currently supports WebM format (Chrome/Firefox)

### Error Messages
- "Error accessing microphone": Check browser permissions
- "Failed to evaluate your response": Check OpenAI API key and network connection
- "Failed to load question": Check backend server and OpenAI API key
