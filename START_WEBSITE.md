# How to Start the Website

## Prerequisites
1. Make sure you have Node.js installed
2. Make sure you have installed dependencies:
   ```bash
   cd IeltsWeb/server
   npm install
   
   cd ../client
   npm install
   ```

## Starting the Website

You need to run **TWO** terminals - one for the server and one for the client.

### Terminal 1: Start the Server
```bash
cd IeltsWeb/server
npm start
```
or
```bash
cd IeltsWeb/server
node src/index.js
```

The server should start on `http://localhost:5000`

### Terminal 2: Start the Client (Frontend)
```bash
cd IeltsWeb/client
npm run dev
```

The client should start on `http://localhost:5173`

## Verify Everything is Running

1. **Server**: Open `http://localhost:5000/health` in your browser - you should see a JSON response
2. **Client**: Open `http://localhost:5173` in your browser - you should see the website

## Troubleshooting

### Server won't start
- Check if port 5000 is already in use
- Make sure `.env` file exists in `IeltsWeb/server/` with required variables
- Check console for error messages

### Client won't start
- Check if port 5173 is already in use
- Make sure all dependencies are installed (`npm install`)
- Check console for error messages

### Chatbot not working
- Make sure `GEMINI_API_KEY` is set in `IeltsWeb/server/.env`
- Restart the server after adding the API key

