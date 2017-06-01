function Chat() {
  this.config = {
    colors: [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ]
  }
  this.initialize = (element) => {

    element.appendChild(this.createDOM());

    this.usernameInput = document.querySelector('.usernameInput');
    this.messages = document.querySelector('.messages');
    this.messageInput = document.querySelector('.messageInput');
    this.loginPage = document.querySelector('.login.page');
    this.chatPage = document.querySelector('.chat.page');

    this.currentInput = this.usernameInput;
    this.currentInput.focus();

    this.socket = io('/chat');
    this.addSocketListeners();
    window.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        this.currentInput.focus();
      }
      if (event.keyCode === 13) {
        if (this.username) {
          this.sendMessage();
        } else {
          this.setUsername();
        }
      }
    });
  }
  this.createDOM = () => {
    const pages = this.createElement('ul', { classes: ['pages'] });
    const chatPage = this.createElement('li', { classes: ['chat', 'page'] });
    const chatArea = this.createElement('div', { classes: ['chatArea'] });
    const messages = this.createElement('ul', { classes: ['messages'] });
    const messageInput = this.createElement('input', { classes: ['messageInput'] });
    const loginPage = this.createElement('li', { classes: ['login', 'page'] });
    const form = this.createElement('div', { classes: ['form'] });
    const title = this.createElement('h3', { classes: ['title'], text: `What's your name?` });
    const usernameInput = this.createElement('input', { classes: ['usernameInput'], attribs: [{ name: 'type', value: 'text' }, { name: 'maxLength', value: '14' }] });

    chatArea.appendChild(messages);
    chatPage.appendChild(chatArea);
    chatPage.appendChild(messageInput);
    pages.appendChild(chatPage);

    form.appendChild(title);
    form.appendChild(usernameInput);
    loginPage.appendChild(form);
    pages.appendChild(loginPage);

    return pages;
  }
  this.createElement = (tag, options) => {
    const el = document.createElement(tag);
    if (options.classes) {
      options.classes.forEach(className => el.classList.add(className));
    }
    if (options.attribs) {
      options.attribs.forEach(attrib => {
        el.setAttribute(attrib.name, attrib.value);
      });
    }
    if (options.text) {
      el.textContent = options.text;
    }
    return el;
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
    // disconnect
    this.socket.on('disconnect', () => this.log('You have been disconnected.'));
  }
}

const chatContainer = document.querySelector('.chat-container');
let chat = new Chat();
chat.initialize(chatContainer);
