const ws = new WebSocket(`ws://${window.location.host}`);

ws.onopen = () => {
    console.log('Connected to server');
};

ws.onmessage = (event) => {
    const li = document.createElement('li');
    li.textContent = event.data;
    document.getElementById('messages').appendChild(li);
};

ws.onclose = () => {
    console.log('Disconnected from server');
};

document.getElementById('sendButton').onclick = () => {
    const message = document.getElementById('messageInput').value;
    ws.send(message);
};