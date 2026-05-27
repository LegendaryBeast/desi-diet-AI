document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const conditionSelect = document.getElementById('condition-select');

    // Load conditions from backend
    async function loadConditions() {
        try {
            const res = await fetch('http://localhost:3000/api/conditions');
            if (res.ok) {
                const data = await res.json();
                if (data.conditions && data.conditions.length > 0) {
                    const currentValue = conditionSelect.value;
                    conditionSelect.innerHTML = '<option value="None">No specific condition</option>';
                    data.conditions.forEach(cond => {
                        const opt = document.createElement('option');
                        opt.value = cond;
                        opt.textContent = cond;
                        conditionSelect.appendChild(opt);
                    });
                    if (Array.from(conditionSelect.options).some(o => o.value === currentValue)) {
                        conditionSelect.value = currentValue;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load conditions list', e);
        }
    }

    loadConditions();

    // Create typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

    // Add marked.js options for security
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        sanitize: true // Simple sanitization to prevent basic XSS
    });

    function appendMessage(content, type, autoScroll = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (type === 'system') {
            contentDiv.innerHTML = marked.parse(content);
        } else {
            contentDiv.textContent = content;
        }

        messageDiv.appendChild(contentDiv);

        if (typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }

        chatBox.appendChild(messageDiv);
        if (autoScroll) scrollToBottom();
    }

    function showTypingIndicator() {
        chatBox.appendChild(typingIndicator);
        typingIndicator.classList.add('active');
        scrollToBottom();
    }

    function removeTypingIndicator() {
        if (typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    const defaultWelcome = { role: 'assistant', content: 'Hello! I am NutriSaathi, your personalized cooking and nutrition guide based on the National Dietary Guidelines for Bangladesh 2022. How can I help you manage your diet today?' };

    // Generate or retrieve session ID
    let sessionId = localStorage.getItem('pusti_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('pusti_session_id', sessionId);
    }

    // Load history from DB
    async function loadHistory() {
        try {
            const res = await fetch(`http://localhost:3000/api/history/${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.history && data.history.length > 0) {
                    data.history.forEach(msg => {
                        appendMessage(msg.content, msg.role === 'assistant' ? 'system' : 'user', false);
                    });
                    scrollToBottom();
                    return;
                }
            }
        } catch (e) {
            console.error('Failed to load history', e);
        }
        // Fallback to welcome message if no history
        appendMessage(defaultWelcome.content, 'system', false);
    }

    loadHistory();

    clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
            try {
                await fetch(`http://localhost:3000/api/history/${sessionId}`, { method: 'DELETE' });
            } catch (e) {
                console.error('Failed to clear history on server', e);
            }
            chatBox.innerHTML = ''; // Clear DOM
            appendMessage(defaultWelcome.content, 'system', false);
        }
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = userInput.value.trim();
        const condition = document.getElementById('condition-select').value;
        if (!message) return;

        // Reset input and disable
        userInput.value = '';
        userInput.disabled = true;
        sendBtn.disabled = true;

        // Show user message
        appendMessage(message, 'user');

        // Show typing indicator
        showTypingIndicator();

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, condition, sessionId })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            removeTypingIndicator();
            appendMessage(data.reply, 'system');

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            const errorMsg = "My apologies, I am currently unable to access my knowledge base. Could you please try again? ";
            appendMessage(errorMsg, 'system');
        } finally {
            // Re-enable input
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    });
});
