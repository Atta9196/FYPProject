// Gemini Service for Web - Similar to mobile app
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export class GeminiService {
  constructor() {
    this.chatHistory = [];
    this.apiBaseUrl = API_BASE_URL;
    console.log('✅ GeminiService initialized - using server API endpoint:', this.apiBaseUrl);
  }

  async sendMessage(userMessage) {
    try {
      console.log('📤 Sending message to server chatbot endpoint...');

      // Add user message to history
      const userChatMessage = {
        id: Date.now().toString(),
        text: userMessage,
        isUser: true,
        timestamp: new Date()
      };
      this.chatHistory.push(userChatMessage);

      // Call server endpoint which uses the API key from server/.env
      const apiUrl = `${this.apiBaseUrl}/api/chatbot/message`;
      
      const requestBody = {
        message: userMessage,
        chatHistory: this.chatHistory.map(msg => ({
          text: msg.text,
          isUser: msg.isUser
        }))
      };

      console.log('📡 Calling server endpoint:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Server Error Response:', errorData);
        console.error('❌ Status Code:', response.status);
        
        // Create more specific error message
        let errorMessage = errorData.error || `API request failed: ${response.status}`;
        if (response.status === 403) {
          errorMessage = 'API key issue detected. Please check your API key configuration in server/.env file.';
        } else if (response.status === 429) {
          errorMessage = 'API quota exceeded. Please wait a moment and try again.';
        } else if (response.status === 500 && errorMessage.includes('API key')) {
          errorMessage = 'Gemini API key not configured on server. Please add GEMINI_API_KEY to server/.env file.';
        }
        
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      console.log('✅ Server response received');
      
      if (!data.response) {
        throw new Error('Invalid API response format');
      }
      
      const botResponse = data.response;
      console.log('📥 Response received:', botResponse.substring(0, 100) + '...');

      // Add bot response to history
      const botChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date()
      };
      this.chatHistory.push(botChatMessage);

      return botResponse;
    } catch (error) {
      console.error('Gemini API Error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack?.substring(0, 200)
      });
      
      // Check for specific error types
      let errorMessage = "I'm having trouble connecting right now";
      if (error.message.includes('403') || error.message.includes('API key')) {
        errorMessage = "API key issue detected. Please check your API key configuration.";
      } else if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('All models failed')) {
        errorMessage = "All available models have quota exceeded. Please wait a moment and try again, or check your quota limits.";
      } else if (error.message.includes('404') || error.message.includes('Model')) {
        errorMessage = "Model not found. Please check the model configuration.";
      }
      
      // Add fallback response to chat history
      const fallbackMessage = {
        id: (Date.now() + 1).toString(),
        text: `${errorMessage} 😊 Try asking me about IELTS practice modules, test strategies, or how to improve your band score!`,
        isUser: false,
        timestamp: new Date(),
      };
      this.chatHistory.push(fallbackMessage);
      
      throw new Error(errorMessage);
    }
  }

  getChatHistory() {
    return [...this.chatHistory];
  }

  clearChatHistory() {
    this.chatHistory = [];
  }
}

export const geminiService = new GeminiService();

