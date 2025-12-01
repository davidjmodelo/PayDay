// AI Chat functionality
const API_URL = 'http://localhost:3000/api/chat';

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const messagesContainer = document.getElementById('chatMessages');
    const sendBtn = document.getElementById('sendBtn');
    const loading = document.getElementById('loading');
    
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    input.value = '';
    
    // Disable input while processing
    sendBtn.disabled = true;
    input.disabled = true;
    loading.classList.add('active');
    
    try {
        // Call the API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                context: "You are a helpful sports gambling assistant for PayDay. Provide insights, predictions, and advice about sports betting. Always remind users to gamble responsibly and never bet more than they can afford to lose."
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addMessage(data.reply, 'ai');
        } else {
            addMessage('Sorry, I encountered an error. Please make sure the server is running.', 'system');
        }
        
    } catch (error) {
        console.error('Error:', error);
        addMessage('Error: Could not connect to AI server. Make sure the Node.js server is running on port 3000.', 'system');
    } finally {
        // Re-enable input
        sendBtn.disabled = false;
        input.disabled = false;
        loading.classList.remove('active');
        input.focus();
    }
}

function addMessage(text, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Allow Enter key to send message
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});
