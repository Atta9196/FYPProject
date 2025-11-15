# IELTS Coach - Use Cases Activity Diagrams

This document contains activity diagrams for all use cases in the IELTS Coach application. Each diagram shows the step-by-step flow of activities for a specific use case.

---

## Table of Contents

1. [Authentication Use Cases](#authentication-use-cases)
2. [Dashboard Use Cases](#dashboard-use-cases)
3. [Speaking Practice Use Cases](#speaking-practice-use-cases)
4. [Writing Practice Use Cases](#writing-practice-use-cases)
5. [Reading Practice Use Cases](#reading-practice-use-cases)
6. [Listening Practice Use Cases](#listening-practice-use-cases)
7. [Full Test Simulation Use Cases](#full-test-simulation-use-cases)
8. [MCQ Practice Use Cases](#mcq-practice-use-cases)
9. [Performance Dashboard Use Cases](#performance-dashboard-use-cases)
10. [Profile Management Use Cases](#profile-management-use-cases)

---

## Authentication Use Cases

### UC-1: User Registration (Email/Password)

**Activity Steps:**
1. User navigates to registration page
2. User enters email address
3. User enters password
4. User confirms password
5. User clicks "Register" button
6. System validates email format
7. System validates password strength
8. System checks if email already exists
9. If email exists, display error message
10. If email doesn't exist, create new user account
11. System sends verification email (optional)
12. System redirects user to login page
13. Display success message

**Decision Points:**
- Email format valid? → No: Show error, Yes: Continue
- Password meets requirements? → No: Show error, Yes: Continue
- Email already registered? → Yes: Show error, No: Create account

---

### UC-2: User Login (Email/Password)

**Activity Steps:**
1. User navigates to login page
2. User enters email address
3. User enters password
4. User clicks "Login" button
5. System validates email format
6. System authenticates credentials with Firebase
7. If credentials invalid, display error message
8. If credentials valid, generate JWT token
9. System stores authentication token
10. System retrieves user profile data
11. System redirects user to dashboard
12. Display welcome message

**Decision Points:**
- Email format valid? → No: Show error, Yes: Continue
- Credentials valid? → No: Show error, Yes: Authenticate

---

### UC-3: Google Sign-In

**Activity Steps:**
1. User navigates to login/registration page
2. User clicks "Continue with Google" button
3. System loads Google OAuth script
4. System renders Google Sign-In button
5. User clicks Google Sign-In button
6. Google OAuth popup appears
7. User selects Google account
8. User grants permissions
9. Google returns ID token
10. System sends ID token to backend
11. Backend verifies token with Firebase Admin
12. Backend checks if user exists
13. If user doesn't exist, create new user account
14. If user exists, retrieve user data
15. Backend generates JWT token
16. System stores authentication token
17. System redirects user to dashboard
18. Display welcome message

**Decision Points:**
- Google authentication successful? → No: Show error, Yes: Continue
- User exists in database? → No: Create account, Yes: Login

---

### UC-4: Forgot Password

**Activity Steps:**
1. User navigates to login page
2. User clicks "Forgot Password" link
3. System displays password reset form
4. User enters email address
5. User clicks "Send Reset Link" button
6. System validates email format
7. System checks if email exists
8. If email doesn't exist, display error message
9. If email exists, generate password reset token
10. System sends password reset email via Firebase
11. User receives email with reset link
12. User clicks reset link in email
13. System displays password reset page
14. User enters new password
15. User confirms new password
16. System validates password strength
17. System updates password in Firebase
18. System redirects user to login page
19. Display success message

**Decision Points:**
- Email format valid? → No: Show error, Yes: Continue
- Email exists? → No: Show error, Yes: Send reset email
- Password meets requirements? → No: Show error, Yes: Update password

---

## Dashboard Use Cases

### UC-5: View Dashboard

**Activity Steps:**
1. User logs into the system
2. System checks authentication status
3. If not authenticated, redirect to login
4. If authenticated, load dashboard page
5. System retrieves user profile data
6. System retrieves overall band score
7. System retrieves module band scores (Speaking, Reading, Writing, Listening)
8. System retrieves test completion statistics
9. System retrieves study hours data
10. System retrieves streak days information
11. System retrieves recent activity list
12. System retrieves achievement badges
13. System retrieves goals and progress data
14. System displays welcome header with user name
15. System displays band overview cards
16. System displays study summary statistics
17. System displays weekly study graph
18. System displays quick action cards
19. System displays recent activity panel
20. System displays goals panel
21. System displays achievements panel
22. User can interact with dashboard elements

**Decision Points:**
- User authenticated? → No: Redirect to login, Yes: Load dashboard

---

### UC-6: View Performance Overview

**Activity Steps:**
1. User is on dashboard
2. System displays overall band score card
3. System displays individual module band scores
4. System calculates band score trends
5. System displays trend indicators (increase/decrease)
6. System displays color-coded band scores
7. User can click on any band score card
8. System navigates to detailed performance view
9. System displays historical band score data
10. System displays improvement suggestions

**Decision Points:**
- Band score >= 8.0? → Yes: Green, No: Check next threshold
- Band score >= 7.0? → Yes: Blue, No: Check next threshold
- Band score >= 6.0? → Yes: Yellow, No: Red

---

## Speaking Practice Use Cases

### UC-7: Record & Submit Mode (Part 2 Practice)

**Activity Steps:**
1. User navigates to Speaking Practice page
2. User selects "Record & Submit" mode
3. System loads random IELTS Part 2 question
4. System displays question on screen
5. System displays preparation time (1 minute)
6. User prepares response
7. User clicks "Start Recording" button
8. System requests microphone permission
9. If permission denied, display error message
10. If permission granted, start MediaRecorder
11. System starts 2-minute timer
12. User speaks their response
13. System records audio in real-time
14. Timer counts down
15. When timer reaches 0, automatically stop recording
16. User can manually stop recording before timer ends
17. System stops MediaRecorder
18. System creates audio blob from recorded chunks
19. System displays "Submitting..." status
20. System uploads audio file to server
21. Server receives audio file
22. Server transcribes audio using OpenAI Whisper
23. Server evaluates transcript using GPT-4o
24. Server generates feedback (Fluency, Lexical, Grammar, Pronunciation)
25. Server calculates band score
26. Server saves practice session to Firestore
27. System receives evaluation results
28. System displays transcript
29. System displays detailed feedback
30. System displays band score
31. System displays improvement suggestions
32. User can view practice history

**Decision Points:**
- Microphone permission granted? → No: Show error, Yes: Start recording
- Timer expired? → Yes: Auto-stop, No: Continue recording
- Audio file valid? → No: Show error, Yes: Process evaluation

---

### UC-8: Real-time Conversation Mode (Parts 1 & 3)

**Activity Steps:**
1. User navigates to Speaking Practice page
2. User selects "Real-time Conversation" mode
3. User clicks "Start Conversation" button
4. System sends request to start session
5. Server generates session ID
6. Server generates initial greeting and question using GPT-4o-mini
7. System receives session ID and initial message
8. System displays examiner's message
9. System displays text input field
10. User types response
11. User clicks "Send" button
12. System sends user message to server with session ID
13. Server processes message with conversation history
14. Server generates contextual response using GPT-4o-mini
15. Server streams response back to client
16. System displays streaming response in real-time
17. System updates conversation history
18. User continues conversation
19. Steps 10-17 repeat for each exchange
20. User clicks "End Session" button
21. System sends end session request with conversation history
22. Server generates summary feedback using GPT-4o-mini
23. Server saves session to Firestore
24. System receives summary feedback
25. System displays overall performance feedback
26. System displays key strengths
27. System displays areas for improvement
28. System displays estimated band score
29. User can view conversation history

**Decision Points:**
- Session started successfully? → No: Show error, Yes: Continue
- User wants to continue? → Yes: Continue conversation, No: End session

---

### UC-9: Voice Conversation Mode (Realtime API)

**Activity Steps:**
1. User navigates to Speaking Practice page
2. User selects "Voice Conversation" mode
3. User clicks "Start Voice Practice" button
4. System requests microphone permission
5. If permission denied, display error message
6. If permission granted, request Realtime API token
7. Server creates OpenAI Realtime API session
8. Server returns session credentials (client_secret)
9. System establishes WebRTC connection to OpenAI
10. System connects microphone to WebRTC stream
11. System starts voice activity detection
12. AI examiner greets user with voice
13. User speaks response
14. System detects voice activity
15. System streams audio to OpenAI Realtime API
16. OpenAI transcribes speech in real-time
17. OpenAI generates response using GPT-4o-realtime
18. OpenAI converts response to speech
19. System receives audio response
20. System plays AI examiner's voice response
21. Conversation continues naturally
22. Steps 13-20 repeat for each exchange
23. User clicks "End Session" button
24. System closes WebRTC connection
25. System sends session end request to server
26. Server generates summary feedback
27. Server saves session to Firestore
28. System displays session summary
29. System displays feedback and band score

**Decision Points:**
- Microphone permission granted? → No: Show error, Yes: Continue
- WebRTC connection established? → No: Show error, Yes: Start conversation
- User wants to continue? → Yes: Continue conversation, No: End session

---

### UC-10: View Speaking History

**Activity Steps:**
1. User navigates to Speaking Practice page
2. User clicks "View History" button
3. System sends request to server with user ID
4. Server queries Firestore for user's practice sessions
5. Server retrieves last 20 practice sessions
6. Server orders sessions by timestamp (descending)
7. Server returns session list
8. System receives session list
9. System displays practice sessions
10. For each session, display:
    - Session type (Recorded/Real-time/Voice)
    - Date and time
    - Question or conversation topic
    - Band score
    - Key feedback points
11. User can click on a session
12. System displays detailed session information
13. System displays full transcript (if available)
14. System displays complete feedback
15. System displays band score breakdown

**Decision Points:**
- History available? → No: Show empty state, Yes: Display sessions

---

## Writing Practice Use Cases

### UC-11: Practice Writing Task 1 (Academic)

**Activity Steps:**
1. User navigates to Writing Practice page
2. User selects "Task 1 - Academic" tab
3. System loads random academic Task 1 prompt
4. System displays prompt (chart, graph, diagram, etc.)
5. System displays task requirements
6. System displays word count requirement (minimum 150 words)
7. System displays time limit (20 minutes)
8. User clicks "Start Practice" button
9. System starts timer (20 minutes)
10. System displays text editor
11. System displays word counter
12. System displays timer countdown
13. User writes response
14. System updates word count in real-time
15. System highlights if word count is below minimum
16. When timer reaches 0, system auto-submits
17. User can manually submit before timer ends
18. User clicks "Submit" button
19. System validates word count
20. If word count < 150, display warning
21. User confirms submission
22. System sends response to server
23. Server evaluates response using GPT-4o
24. Server scores on 4 criteria:
    - Task Achievement
    - Coherence & Cohesion
    - Lexical Resource
    - Grammatical Range & Accuracy
25. Server calculates overall band score
26. Server generates detailed feedback
27. Server generates improvement suggestions
28. Server saves submission to localStorage
29. System receives evaluation results
30. System displays band scores for each criterion
31. System displays overall band score
32. System displays detailed feedback
33. System displays suggestions
34. System displays penalties (if any)
35. User can view writing history

**Decision Points:**
- Word count >= 150? → No: Show warning, Yes: Allow submission
- Timer expired? → Yes: Auto-submit, No: Continue writing
- Response on-topic? → No: Apply penalty, Yes: Continue evaluation

---

### UC-12: Practice Writing Task 1 (General)

**Activity Steps:**
1. User navigates to Writing Practice page
2. User selects "Task 1 - General" tab
3. System loads random general Task 1 prompt
4. System displays prompt (letter writing scenario)
5. System displays task requirements
6. System displays word count requirement (minimum 150 words)
7. System displays time limit (20 minutes)
8. User clicks "Start Practice" button
9. System starts timer (20 minutes)
10. System displays text editor
11. System displays word counter
12. System displays timer countdown
13. User writes letter response
14. System updates word count in real-time
15. System highlights if word count is below minimum
16. When timer reaches 0, system auto-submits
17. User can manually submit before timer ends
18. User clicks "Submit" button
19. System validates word count
20. If word count < 150, display warning
21. User confirms submission
22. System sends response to server
23. Server evaluates response using GPT-4o
24. Server scores on 4 criteria
25. Server calculates overall band score
26. Server generates detailed feedback
27. Server saves submission to localStorage
28. System receives evaluation results
29. System displays evaluation results
30. User can view writing history

**Decision Points:**
- Word count >= 150? → No: Show warning, Yes: Allow submission
- Timer expired? → Yes: Auto-submit, No: Continue writing

---

### UC-13: Practice Writing Task 2 (Essay)

**Activity Steps:**
1. User navigates to Writing Practice page
2. User selects "Task 2 - Essay" tab
3. System loads random Task 2 essay prompt
4. System displays essay question
5. System displays task requirements
6. System displays word count requirement (minimum 250 words)
7. System displays time limit (40 minutes)
8. User clicks "Start Practice" button
9. System starts timer (40 minutes)
10. System displays text editor
11. System displays word counter
12. System displays timer countdown
13. User writes essay response
14. System updates word count in real-time
15. System highlights if word count is below minimum
16. When timer reaches 0, system auto-submits
17. User can manually submit before timer ends
18. User clicks "Submit" button
19. System validates word count
20. If word count < 250, display warning
21. User confirms submission
22. System sends response to server
23. Server evaluates response using GPT-4o
24. Server scores on 4 criteria:
    - Task Response
    - Coherence & Cohesion
    - Lexical Resource
    - Grammatical Range & Accuracy
25. Server checks for structure issues
26. Server checks for grammar issues
27. Server calculates overall band score
28. Server applies penalties if needed
29. Server generates detailed feedback
30. Server saves submission to localStorage
31. System receives evaluation results
32. System displays band scores for each criterion
33. System displays overall band score
34. System displays detailed feedback
35. System displays suggestions
36. System displays penalties (if any)
37. User can view writing history

**Decision Points:**
- Word count >= 250? → No: Show warning, Yes: Allow submission
- Timer expired? → Yes: Auto-submit, No: Continue writing
- Structure issues? → Yes: Apply penalty, No: Continue
- Grammar issues? → Yes: Apply penalty, No: Continue

---

### UC-14: View Writing History

**Activity Steps:**
1. User navigates to Writing Practice page
2. User clicks "View History" button
3. System loads writing history from localStorage
4. System retrieves last 20 submissions
5. System orders submissions by timestamp (descending)
6. System displays submission list
7. For each submission, display:
    - Task type (Task 1 Academic/General, Task 2)
    - Date and time
    - Prompt title
    - Word count
    - Overall band score
    - Time taken
8. User can click on a submission
9. System displays detailed submission view
10. System displays original prompt
11. System displays user's response
12. System displays all band scores
13. System displays complete feedback
14. System displays suggestions
15. User can delete submission from history

**Decision Points:**
- History available? → No: Show empty state, Yes: Display submissions

---

## Reading Practice Use Cases

### UC-15: Practice Reading Test

**Activity Steps:**
1. User navigates to Reading Practice page
2. System loads reading test passages
3. System displays test instructions
4. System displays time limit (60 minutes)
5. User clicks "Start Test" button
6. System starts timer (60 minutes)
7. System displays first reading passage
8. System displays questions for the passage
9. User reads passage
10. User answers questions
11. System tracks answered questions
12. User navigates to next passage
13. System displays next passage and questions
14. Steps 9-13 repeat for all passages
15. When timer reaches 0, system auto-submits
16. User can manually submit before timer ends
17. User clicks "Submit Test" button
18. System validates all questions answered
19. System calculates score
20. System displays results
21. System displays correct/incorrect answers
22. System displays band score
23. System displays time taken
24. System saves results to database
25. User can review answers

**Decision Points:**
- Timer expired? → Yes: Auto-submit, No: Continue
- All questions answered? → No: Show warning, Yes: Allow submission

---

### UC-16: View Reading Results

**Activity Steps:**
1. User completes reading test
2. System calculates score based on correct answers
3. System converts score to band score
4. System displays overall score
5. System displays band score
6. System displays score breakdown by passage
7. System displays correct answers
8. System displays incorrect answers with correct answers
9. System displays time taken
10. System saves results to performance database
11. User can view detailed answer explanations
12. User can retake test

**Decision Points:**
- Score >= 39-40? → Yes: Band 9, No: Check next range
- Score >= 37-38? → Yes: Band 8.5, No: Check next range
- (Continue for all band score ranges)

---

## Listening Practice Use Cases

### UC-17: Practice Listening Test

**Activity Steps:**
1. User navigates to Listening Practice page
2. System loads listening test audio
3. System displays test instructions
4. System displays time limit (40 minutes total)
5. User clicks "Start Test" button
6. System starts audio playback
7. System displays questions for first recording
8. User listens to recording
9. User answers questions while listening
10. Recording finishes
11. System moves to next recording
12. Steps 7-11 repeat for all 4 recordings
13. System provides 10 minutes transfer time
14. User transfers answers to answer sheet
15. When transfer time ends, system auto-submits
16. User can manually submit before time ends
17. User clicks "Submit Test" button
18. System validates all questions answered
19. System calculates score
20. System displays results
21. System displays correct/incorrect answers
22. System displays band score
23. System displays time taken
24. System saves results to database
25. User can review answers

**Decision Points:**
- Transfer time expired? → Yes: Auto-submit, No: Continue
- All questions answered? → No: Show warning, Yes: Allow submission

---

### UC-18: View Listening Results

**Activity Steps:**
1. User completes listening test
2. System calculates score based on correct answers
3. System converts score to band score
4. System displays overall score
5. System displays band score
6. System displays score breakdown by section
7. System displays correct answers
8. System displays incorrect answers with correct answers
9. System displays time taken
10. System saves results to performance database
11. User can replay audio sections
12. User can view detailed answer explanations
13. User can retake test

**Decision Points:**
- Score >= 39-40? → Yes: Band 9, No: Check next range
- Score >= 37-38? → Yes: Band 8.5, No: Check next range
- (Continue for all band score ranges)

---

## Full Test Simulation Use Cases

### UC-19: Start Full Test Simulation

**Activity Steps:**
1. User navigates to Full Test Simulator page
2. System displays test overview
3. System displays test structure:
    - Listening (40 minutes)
    - Reading (60 minutes)
    - Writing (60 minutes)
    - Speaking (11-14 minutes)
4. System displays total time (approximately 2 hours 55 minutes)
5. User clicks "Start Full Test" button
6. System displays test instructions
7. System confirms user is ready
8. User confirms readiness
9. System initializes test session
10. System generates unique test ID
11. System starts overall timer
12. System navigates to Listening section
13. System displays Listening section instructions
14. User begins Listening section
15. System tracks progress through all sections
16. System saves progress after each section
17. System allows breaks between sections
18. User completes all sections
19. System calculates overall results
20. System displays comprehensive results
21. System saves complete test results

**Decision Points:**
- User ready? → No: Return to overview, Yes: Start test
- All sections completed? → No: Continue, Yes: Calculate results

---

### UC-20: Complete Listening Section (Full Test)

**Activity Steps:**
1. User is in Full Test Simulation
2. System displays Listening section tab
3. System loads listening test audio
4. System displays Listening instructions
5. System displays time limit (40 minutes)
6. User clicks "Start Listening Test" button
7. System starts audio playback
8. System starts section timer
9. System displays questions for first recording
10. User listens and answers questions
11. Recording finishes
12. System moves to next recording
13. Steps 10-12 repeat for all 4 recordings
14. System provides 10 minutes transfer time
15. User transfers answers
16. When time ends, system auto-advances
17. User can manually advance to next section
18. System saves Listening section answers
19. System marks Listening section as complete
20. System enables Reading section tab

**Decision Points:**
- Time expired? → Yes: Auto-advance, No: Continue
- All recordings completed? → Yes: Enable transfer time, No: Continue

---

### UC-21: Complete Reading Section (Full Test)

**Activity Steps:**
1. User completed Listening section
2. System enables Reading section tab
3. User clicks Reading section tab
4. System loads reading test passages
5. System displays Reading instructions
6. System displays time limit (60 minutes)
7. User clicks "Start Reading Test" button
8. System starts section timer
9. System displays first reading passage
10. System displays questions for the passage
11. User reads passage and answers questions
12. User navigates to next passage
13. Steps 11-12 repeat for all passages
14. When timer reaches 0, system auto-advances
15. User can manually advance to next section
16. System saves Reading section answers
17. System marks Reading section as complete
18. System enables Writing section tab

**Decision Points:**
- Timer expired? → Yes: Auto-advance, No: Continue
- All passages completed? → Yes: Allow advance, No: Continue

---

### UC-22: Complete Writing Section (Full Test)

**Activity Steps:**
1. User completed Reading section
2. System enables Writing section tab
3. User clicks Writing section tab
4. System loads writing prompts
5. System displays Writing instructions
6. System displays time limit (60 minutes total)
7. System displays Task 1 requirements (20 minutes, 150 words)
8. System displays Task 2 requirements (40 minutes, 250 words)
9. User clicks "Start Writing Test" button
10. System starts section timer
11. System displays Task 1 prompt
12. System starts Task 1 timer (20 minutes)
13. User writes Task 1 response
14. When Task 1 timer ends, system auto-advances to Task 2
15. User can manually advance to Task 2
16. System displays Task 2 prompt
17. System starts Task 2 timer (40 minutes)
18. User writes Task 2 response
19. When section timer ends, system auto-advances
20. User can manually advance to next section
21. System saves Writing section responses
22. System marks Writing section as complete
23. System enables Speaking section tab

**Decision Points:**
- Task 1 timer expired? → Yes: Auto-advance to Task 2, No: Continue
- Section timer expired? → Yes: Auto-advance, No: Continue

---

### UC-23: Complete Speaking Section (Full Test)

**Activity Steps:**
1. User completed Writing section
2. System enables Speaking section tab
3. User clicks Speaking section tab
4. System displays Speaking instructions
5. System displays test structure:
    - Part 1: Introduction (4-5 minutes)
    - Part 2: Long turn (3-4 minutes)
    - Part 3: Discussion (4-5 minutes)
6. User clicks "Start Speaking Test" button
7. System initializes speaking session
8. System starts Part 1
9. AI examiner asks Part 1 questions
10. User responds to questions
11. System records responses
12. Part 1 completes
13. System starts Part 2
14. System displays Part 2 question card
15. System provides 1 minute preparation time
16. User prepares response
17. System starts 2-minute speaking time
18. User speaks response
19. System records response
20. Part 2 completes
21. System starts Part 3
22. AI examiner asks Part 3 discussion questions
23. User responds to questions
24. System records responses
25. Part 3 completes
26. System ends speaking session
27. System evaluates all speaking parts
28. System calculates speaking band score
29. System saves Speaking section results
30. System marks Speaking section as complete
31. System marks Full Test as complete
32. System calculates overall test results

**Decision Points:**
- All parts completed? → No: Continue, Yes: Evaluate and complete

---

## MCQ Practice Use Cases

### UC-24: Practice Multiple Choice Questions

**Activity Steps:**
1. User navigates to MCQ Practice page
2. System loads MCQ question set
3. System displays question categories
4. User selects category (Reading/Listening)
5. System loads questions for selected category
6. System displays first question
7. System displays multiple choice options
8. User reads question
9. User selects answer
10. System highlights selected answer
11. User clicks "Next" button
12. System moves to next question
13. Steps 8-12 repeat for all questions
14. User can navigate to previous questions
15. User can review answers
16. User clicks "Submit" button
17. System validates all questions answered
18. System calculates score
19. System displays results
20. System displays correct/incorrect answers
21. System displays explanations
22. System saves results to database
23. User can retake practice

**Decision Points:**
- All questions answered? → No: Show warning, Yes: Allow submission
- Answer correct? → Yes: Mark correct, No: Mark incorrect

---

### UC-25: View MCQ Results

**Activity Steps:**
1. User completes MCQ practice
2. System calculates score
3. System displays overall score
4. System displays percentage correct
5. System displays score breakdown by category
6. System displays correct answers
7. System displays incorrect answers
8. System displays correct answer for each question
9. System displays explanations for each question
10. System saves results to performance database
11. User can review each question
12. User can view detailed explanations
13. User can retake practice

**Decision Points:**
- Score >= 90%? → Yes: Excellent, No: Check next range
- Score >= 70%? → Yes: Good, No: Needs improvement

---

## Performance Dashboard Use Cases

### UC-26: View Performance Analytics

**Activity Steps:**
1. User navigates to Performance Dashboard page
2. System loads user performance data
3. System retrieves band score history
4. System retrieves test completion data
5. System retrieves module performance data
6. System retrieves practice history
7. System displays performance header
8. System displays time frame selector (1 month, 3 months, 6 months, 1 year)
9. User selects time frame
10. System filters data by selected time frame
11. System displays band score progress chart
12. System displays weekly test completion graph
13. System displays module breakdown
14. System displays practice history timeline
15. System displays AI insights
16. System displays strengths list
17. System displays improvement areas
18. System displays recommendations
19. System displays goals progress
20. User can interact with charts
21. User can export data

**Decision Points:**
- Time frame selected? → Yes: Filter data, No: Use default
- Data available? → No: Show empty state, Yes: Display charts

---

### UC-27: View Band Score Progress

**Activity Steps:**
1. User is on Performance Dashboard
2. System retrieves historical band scores
3. System organizes scores by date
4. System calculates trends
5. System displays line chart with band scores over time
6. System displays overall band score trend
7. System displays individual module trends:
    - Speaking
    - Reading
    - Writing
    - Listening
8. System displays trend indicators (increasing/decreasing)
9. System displays improvement percentages
10. System highlights significant improvements
11. System highlights areas needing attention
12. User can hover over data points for details
13. User can filter by module
14. User can change time range

**Decision Points:**
- Trend increasing? → Yes: Show positive indicator, No: Show negative indicator
- Improvement significant? → Yes: Highlight, No: Normal display

---

### UC-28: View Module Breakdown

**Activity Steps:**
1. User is on Performance Dashboard
2. System retrieves module-specific data
3. System displays Speaking module breakdown:
    - Average band score
    - Number of attempts
    - Improvement trend
    - Weak areas
4. System displays Listening module breakdown:
    - Average accuracy
    - Number of attempts
    - Improvement trend
    - Weak areas
5. System displays Reading module breakdown:
    - Reading speed
    - Accuracy percentage
    - Number of attempts
    - Improvement trend
    - Weak areas
6. System displays Writing module breakdown:
    - Task 1 average score
    - Task 2 average score
    - Number of attempts
    - Improvement trend
    - Weak areas
7. System displays radar chart comparing all modules
8. System displays bar chart with module comparisons
9. User can click on module for detailed view
10. System navigates to module-specific analytics

**Decision Points:**
- Module data available? → No: Show placeholder, Yes: Display breakdown

---

### UC-29: View AI Insights

**Activity Steps:**
1. User is on Performance Dashboard
2. System analyzes user performance data
3. System identifies patterns and trends
4. System generates insights using AI (if available)
5. System displays strengths section
6. System lists key strengths
7. System displays improvement areas section
8. System lists areas needing improvement
9. System displays recommendations section
10. System provides actionable recommendations
11. System displays personalized study plan suggestions
12. System displays predicted band score (if applicable)
13. System displays time to target band score
14. User can view detailed insights
15. User can save recommendations

**Decision Points:**
- AI analysis available? → No: Use rule-based insights, Yes: Use AI insights

---

## Profile Management Use Cases

### UC-30: View Profile

**Activity Steps:**
1. User navigates to Profile page
2. System checks authentication
3. If not authenticated, redirect to login
4. If authenticated, load user profile data
5. System retrieves user information from database
6. System displays profile picture
7. System displays user name
8. System displays email address
9. System displays account creation date
10. System displays last login date
11. System displays profile statistics
12. User can view profile information
13. User can edit profile information

**Decision Points:**
- User authenticated? → No: Redirect to login, Yes: Load profile

---

### UC-31: Update Profile Information

**Activity Steps:**
1. User is on Profile page
2. User clicks "Edit Profile" button
3. System enables edit mode
4. System displays editable fields:
    - Name
    - Email (if allowed)
    - Profile picture
5. User modifies name field
6. User uploads new profile picture (optional)
7. System validates name format
8. System validates email format (if changed)
9. If validation fails, display error message
10. If validation passes, user clicks "Save" button
11. System sends update request to server
12. Server validates data
13. Server updates user profile in database
14. Server updates Firebase user profile
15. System receives confirmation
16. System updates displayed profile information
17. System displays success message
18. System disables edit mode

**Decision Points:**
- Name valid? → No: Show error, Yes: Continue
- Email valid (if changed)? → No: Show error, Yes: Continue
- Update successful? → No: Show error, Yes: Display success

---

### UC-32: Change Password

**Activity Steps:**
1. User is on Profile page
2. User navigates to Security section
3. User enters current password
4. User enters new password
5. User confirms new password
6. System validates current password
7. System validates new password strength
8. System checks if new password matches confirmation
9. If validation fails, display error message
10. If validation passes, user clicks "Change Password" button
11. System sends password change request to server
12. Server verifies current password with Firebase
13. If current password incorrect, return error
14. If current password correct, update password in Firebase
15. System receives confirmation
16. System clears password fields
17. System displays success message
18. System logs user out (optional, for security)
19. System redirects to login page

**Decision Points:**
- Current password correct? → No: Show error, Yes: Continue
- New password meets requirements? → No: Show error, Yes: Continue
- Passwords match? → No: Show error, Yes: Update password

---

### UC-33: Update Preferences

**Activity Steps:**
1. User is on Profile page
2. User navigates to Preferences section
3. System displays available preferences:
    - Dark mode toggle
    - Language selection
    - Notification settings
    - Email preferences
4. User toggles dark mode
5. System applies dark mode theme immediately
6. User changes language preference
7. User updates notification settings
8. User updates email preferences
9. User clicks "Save Preferences" button
10. System saves preferences to localStorage
11. System sends preferences to server (optional)
12. Server saves preferences to database
13. System receives confirmation
14. System displays success message
15. System applies saved preferences

**Decision Points:**
- Preferences changed? → Yes: Save, No: No action needed
- Save successful? → No: Show error, Yes: Display success

---

## Additional Notes

### Common Activities Across Use Cases

1. **Authentication Check**: Most use cases start with checking if the user is authenticated
2. **Error Handling**: All use cases include error handling and user feedback
3. **Data Persistence**: Most use cases save data to either localStorage, Firestore, or both
4. **Loading States**: All use cases display loading indicators during async operations
5. **Success Feedback**: All use cases provide success messages upon completion

### System Components

- **Frontend**: React application with Vite
- **Backend**: Node.js/Express server
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **AI Services**: OpenAI (GPT-4o, GPT-4o-mini, Whisper, Realtime API)
- **Storage**: LocalStorage for client-side data, Firestore for server-side data

### Activity Diagram Notation

- **Start**: [Start]
- **Activity**: Activity name
- **Decision**: {Decision question?}
- **End**: [End]
- **Parallel**: Activities that can occur simultaneously
- **Loop**: Activities that repeat

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: System Analysis

