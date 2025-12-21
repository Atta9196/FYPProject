/**
 * Test script to check OpenAI Realtime API access
 * Run with: node test-realtime-api.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fetch = require('node-fetch');

async function testRealtimeAPI() {
  console.log('🧪 Testing OpenAI Realtime API Access...\n');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in .env file');
    return;
  }
  
  console.log('✅ API Key found');
  console.log('🔑 API Key prefix:', process.env.OPENAI_API_KEY.substring(0, 10) + '...\n');
  
  try {
    console.log('📡 Attempting to create Realtime API session...');
    console.log('📋 Model: gpt-4o-mini-realtime-preview-2024-12-17 (trying mini first)');
    console.log('📋 Endpoint: https://api.openai.com/v1/realtime/sessions\n');
    
    // Try mini model first (may have different access requirements)
    let response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        voice: 'verse',
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful assistant.',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 2000
        }
      })
    });
    
    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      
      console.error('\n❌ ERROR:', errorData);
      
      if (response.status === 401) {
        console.error('\n🔍 DIAGNOSIS:');
        console.error('   - API key authentication failed');
        console.error('   - Possible causes:');
        console.error('     1. API key is invalid or expired');
        console.error('     2. API key does not have Realtime API access');
        console.error('     3. API key permissions are restricted');
        console.error('\n💡 SOLUTION:');
        console.error('   1. Go to https://platform.openai.com/account/api-keys');
        console.error('   2. Check if your API key has "All" permissions');
        console.error('   3. If restricted, ensure Realtime API has "Write" permission');
        console.error('   4. Realtime API may require beta access - contact OpenAI support');
      } else if (response.status === 403) {
        console.error('\n🔍 DIAGNOSIS:');
        console.error('   - Access forbidden');
        console.error('   - Your API key may not have permission for Realtime API');
        console.error('\n💡 SOLUTION:');
        console.error('   - Check API key permissions in OpenAI dashboard');
        console.error('   - Realtime API may require special access');
      } else       if (response.status === 404) {
        console.error('\n🔍 DIAGNOSIS:');
        console.error('   - Model not found');
        console.error('   - Trying full model as fallback...\n');
        
        // Try full model
        const fullModelResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-realtime-preview-2024-12-17',
            voice: 'verse',
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful assistant.',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 2000
            }
          })
        });
        
        if (fullModelResponse.ok) {
          const fullSession = await fullModelResponse.json();
          console.log('✅ SUCCESS with full model!');
          console.log('   Session ID:', fullSession.id);
          console.log('\n💡 Use: gpt-4o-realtime-preview-2024-12-17');
          return;
        } else {
          console.error('   - Full model also failed');
          console.error('\n💡 SOLUTION:');
          console.error('   - Check if Realtime API is enabled for your account');
          console.error('   - Contact OpenAI support for Realtime API access');
        }
      }
      
      return;
    }
    
    const session = await response.json();
    console.log('\n✅ SUCCESS! Realtime session created:');
    console.log('   Session ID:', session.id);
    console.log('   Model:', session.model);
    console.log('   Client Secret:', session.client_secret ? 'Present' : 'Missing');
    
    if (session.client_secret) {
      if (typeof session.client_secret === 'string') {
        console.log('   Client Secret Type: String');
        console.log('   Client Secret Preview:', session.client_secret.substring(0, 20) + '...');
      } else if (session.client_secret.value) {
        console.log('   Client Secret Type: Object with .value');
        console.log('   Client Secret Preview:', session.client_secret.value.substring(0, 20) + '...');
      } else {
        console.log('   Client Secret Type: Object (no .value property)');
        console.log('   Client Secret:', JSON.stringify(session.client_secret).substring(0, 100));
      }
    }
    
    console.log('\n✅ Your API key has Realtime API access!');
    console.log('✅ The implementation should work correctly.');
    
  } catch (error) {
    console.error('\n❌ Network or other error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRealtimeAPI();
