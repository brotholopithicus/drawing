function Chat() {
  this.config = {
    fade_time: 150,
    typing_timer_length: 400,
    colors: [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ]
  }
  this.initialize = () => {
    this.usernameInput = document.querySelector('.usernameInput');
    this.messages = document.querySelector('.messages');
    this.messageInput = document.querySelector('.messageInput');
    this.loginPage = document.querySelector('.login.page');
    this.chatPage = document.querySelector('.chat.page');

    this.currentInput = this.usernameInput;
    this.currentInput.focus();

    this.socket = io('/chat');
    this.addSocketListeners();
    this.typing = false;
    this.messageInput.addEventListener('keydown', () => this.updateTyping());
    window.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        this.currentInput.focus();
      }
      if (event.keyCode === 13) {
        if (this.username) {
          this.sendMessage();
          this.socket.emit('stop styping');
          this.typing = false;
        } else {
          this.setUsername();
        }
      }
    });
  }
  this.addParticipantsMessage = (data) => {
    let message = `there are ${data.numUsers} participant(s)`;
    this.log(message);
  }
  this.log = (msg, opts) => {
    const el = document.createElement('li');
    el.classList.add('log');
    el.textContent = msg;
    this.addMessageElement(el, opts);
  }
  this.setUsername = () => {
    this.username = this.usernameInput.value.trim();
    this.loginPage.style.display = 'none';
    this.chatPage.style.display = 'block';
    this.currentInput = this.messageInput;
    this.currentInput.focus();

    this.socket.emit('add user', this.username);
  }
  this.sendMessage = () => {
    let message = this.messageInput.value.trim();
    this.messageInput.value = '';
    this.addChatMessage({ username: this.username, message });
    this.socket.emit('new message', message);
  }
  this.addChatMessage = (data, options = { fade: true, prepend: false }) => {
    const username = document.createElement('span');
    username.classList.add('username');
    username.style.color = this.getUsernameColor(data.username);
    username.textContent = data.username;
    const body = document.createElement('span');
    body.classList.add('messageBody');
    body.textContent = data.message;
    const msg = document.createElement('li');
    msg.classList.add('message');
    if (data.typing) msg.classList.add('typing');
    msg.dataset.username = data.username;

    msg.appendChild(username);
    msg.appendChild(body);

    this.addMessageElement(msg, {});
  }
  this.addMessageElement = (el, options = { fade: true, prepend: false }) => {
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
  }
  this.getUsernameColor = (username) => {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    let index = Math.abs(hash % this.config.colors.length);
    return this.config.colors[index];
  }
  this.addChatTyping = (data) => {
    data.typing = true;
    data.message = 'is typing';
    this.addChatMessage(data);
  }
  this.removeChatTyping = (data) => {
    let el = this.getTypingMessages(data)[0];
    let parentNode = el.parentNode;
    parentNode.removeChild(el);
  }
  this.getTypingMessages = (data) => {
    return Array.from(document.querySelectorAll('.typing')).filter(el => el.dataset.username === data.username);
  }
  this.updateTyping = () => {
    if (!this.typing) {
      this.typing = true;
      this.socket.emit('typing');
    }
    let lastTypingTime = (new Date()).getTime();

    setTimeout(() => {
      let typingTimer = (new Date()).getTime();
      let timeDiff = typingTimer - lastTypingTime;
      if (timeDiff >= this.config.typing_timer_length && this.typing) {
        this.socket.emit('stop typing');
        this.typing = false;
      }
    }, this.config.typing_timer_length);
  }
  this.addSocketListeners = () => {
    // new message
    this.socket.on('new message', (data) => this.addChatMessage(data));
    // user joined
    this.socket.on('user joined', (data) => {
      this.log(data.username + ' joined');
      this.addParticipantsMessage(data);
    });
    // login
    this.socket.on('login', (data) => {
      this.addParticipantsMessage(data);
    });
    // user left
    this.socket.on('user left', (data) => {
      this.log(data.username + ' left');
      this.addParticipantsMessage(data);
    });
    // typing
    this.socket.on('typing', (data) => this.addChatTyping(data));
    // stop typing
    this.socket.on('stop typing', (data) => this.removeChatTyping(data));
    // disconnect
    this.socket.on('disconnect', () => this.log('You have been disconnected.'));
  }
}

let chat = new Chat();
chat.initialize();
