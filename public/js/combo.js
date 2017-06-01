function App() {
  this.config = {
    colors: [
      '#001F3F',
      '#0074D9',
      '#7FDBFF',
      '#39CCCC',
      '#3D9970',
      '#2ECC40',
      '#01FF70',
      '#FFDC00',
      '#FF851B',
      '#FF4136',
      '#F012BE',
      '#B10DC9',
      '#85144B',
      '#AAAAAA',
      '#111111',
    ]
  }
  this.initialize = (element) => {
    const { canvas, toolbar } = this.createDOM();
    element.appendChild(canvas);
    element.appendChild(toolbar);

    this.socket = io();
    this.canvas = document.querySelector('.whiteboard');
    this.colors = document.querySelectorAll('.color');
    this.clearButton = document.querySelector('button#clear');
    this.ctx = this.canvas.getContext('2d');
    this.current = { color: 'black' }
    this.drawing = false;
    ['mousedown', 'mouseup', 'mouseout', 'mousemove'].forEach(evt => this.canvas.addEventListener(evt, this.throttle(this.mouseEventHandler, 10)));
    this.colors.forEach(color => {
      color.style.backgroundColor = color.dataset.color;
      color.addEventListener('click', this.updateColor);
    });
    this.clearButton.addEventListener('click', this.clearEventHandler);
    this.socket.on('drawing', this.onDrawingEvent);
    this.socket.on('history', this.onCanvasHistory);
    this.socket.on('clear', this.clearCanvas);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }
  this.clearCanvas = (emit) => {
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!emit) return;
    this.socket.emit('clear');
  }
  this.clearEventHandler = (e) => {
    this.clearCanvas(true);
  }
  this.onCanvasHistory = (history) => {
    history.forEach(item => {
      this.onDrawingEvent(item);
    });
  }
  this.updateColor = (e) => {
    this.current.color = e.target.dataset.color;
  }
  this.drawLine = (x0, y0, x1, y1, color, emit) => {
    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.closePath();
    if (!emit) return;
    const { w, h } = this.getCanvasDimensions();
    this.socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color
    });
  }
  this.mouseEventHandler = (e) => {
    switch (e.type) {
      case 'mousedown':
        this.drawing = true;
        this.current.x = e.clientX;
        this.current.y = e.clientY;
        break;
      case 'mousemove':
        if (!this.drawing) return;
        this.drawLine(this.current.x, this.current.y, e.clientX, e.clientY, this.current.color, true);
        this.current.x = e.clientX;
        this.current.y = e.clientY;
        break;
      default: // mouseup and mouseout
        if (!this.drawing) return;
        this.drawing = false;
        this.drawLine(this.current.x, this.current.y, e.clientX, e.clientY, this.current.color, true);
        break;
    }
  }
  this.onDrawingEvent = (data) => {
    const { w, h } = this.getCanvasDimensions();
    this.drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }
  this.onResize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.socket.emit('resize');
  }
  this.throttle = (callback, delay) => {
    let previousCall = new Date().getTime();
    return function() {
      let time = new Date().getTime();
      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    }
  }
  this.getCanvasDimensions = () => ({ w: this.canvas.width, h: this.canvas.height })
  this.createDOM = () => {
    const canvas = this.createElement('canvas', { classes: ['whiteboard'] });
    const toolbar = this.createElement('div', { classes: ['toolbar'] });
    const colors = this.createElement('div', { classes: ['colors'] });
    this.config.colors.forEach(color => {
      let el = this.createElement('div', { classes: ['color'], attribs: [{ name: 'data-color', value: color }] });
      colors.appendChild(el);
    });
    const clearButton = this.createElement('button', { id: 'clear', text: 'Clear' });
    toolbar.appendChild(colors);
    toolbar.appendChild(clearButton);
    return {
      canvas,
      toolbar
    }
  }
  this.createElement = (tag, options) => {
    const el = document.createElement(tag);
    if (options.id) {
      el.id = options.id;
    }
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
}

const drawContainer = document.querySelector('.draw-container');
let app = new App();
app.initialize(drawContainer);

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

    this.participants = document.querySelector('#numUsers');
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
    const title = this.createElement('h3', { classes: ['title'], text: `Enter Your Username` });
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
  this.log = (msg, opts) => {
    const el = document.createElement('li');
    el.classList.add('log');
    el.textContent = msg;
    this.addMessageElement(el, opts);
  }
  this.setUsername = () => {
    this.username = this.usernameInput.value.trim();
    let chatToggle = document.querySelector('#chatToggle');
    chatToggle.disabled = false;
    chatToggle.classList.add('flash');
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
      this.updateUserNum(data);
    });
    // login
    this.socket.on('login', (data) => {
      this.updateUserNum(data);
    });
    // user left
    this.socket.on('user left', (data) => {
      if (this.username) this.log(data.username + ' left');
      this.updateUserNum(data);
    });
    // disconnect
    this.socket.on('disconnect', () => this.log('You have been disconnected.'));
  }
  this.updateUserNum = (data) => {
    this.participants.textContent = data.numUsers;
  }
}

const chatContainer = document.querySelector('.chat-container');
let chat = new Chat();
chat.initialize(chatContainer);

const chatToggle = document.querySelector('#chatToggle');
chatToggle.addEventListener('click', onChatToggle);

function onChatToggle(event) {
  chatContainer.classList.toggle('closed');
  if (chatContainer.classList.contains('closed')) {
    chatToggle.textContent = 'Open Chat';
  } else {
    chatToggle.textContent = 'Close Chat';
  }
}
