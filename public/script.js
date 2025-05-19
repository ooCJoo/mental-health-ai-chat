async function sendMessage() {
  const userInput = document.getElementById('userInput');
  const chatBox = document.getElementById('chatBox');
  const userText = userInput.value.trim();

  if (!userText) return;

  // Add user message to chat
  chatBox.innerHTML += `<div class="user-msg">You: ${userText}</div>`;
  userInput.value = '';

  // Fetch bot response
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText })
    });
    const data = await response.json();
    chatBox.innerHTML += `<div class="bot-msg">Bot: ${data.reply}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll
  } catch (error) {
    chatBox.innerHTML += `<div class="bot-msg">Bot: Sorry, I'm having trouble connecting.</div>`;
  }
}