function App() {
  this.config = {
    // colors: [
    //   '#001F3F', '#0074D9', '#7FDBFF',
    //   '#39CCCC', '#3D9970', '#2ECC40',
    //   '#01FF70', '#FFDC00', '#FF851B',
    //   '#FF4136', '#F012BE', '#B10DC9',
    //   '#85144B', '#AAAAAA', '#111111',
    //   '#FFFFFF'
    // ]
    colors: [
      '#000000', '#ffffff', '#5c3e28',
      '#ff3b3b', '#f7821c', '#ffdc00',
      '#2ee643', '#007fee', '#B10DC9',
      '#F012BE'
    ]
  }
  this.initialize = (element) => {
    this.current = { x: 0, y: 0, color: this.config.colors[0], size: 25 };

    const { canvas, toolbar } = this.createDOM();
    this.element = element;
    this.element.appendChild(canvas);
    this.element.appendChild(toolbar);

    this.socket = io();

    this.canvas = document.querySelector('.whiteboard');
    this.colors = document.querySelectorAll('.color');
    this.lineWidthRange = document.querySelector('.line-width');
    this.lineWidthDisplay = document.querySelector('.circle');
    this.clearButton = document.querySelector('button#clear');

    this.ctx = this.canvas.getContext('2d');

    this.drawing = false;

    ['mousedown', 'mouseup', 'mouseout', 'mousemove'].forEach(evt => this.canvas.addEventListener(evt, this.throttle(this.mouseEventHandler, 0)));

    this.colors.forEach(color => {
      color.style.backgroundColor = color.dataset.color;
      color.addEventListener('click', this.updateColor);
    });

    this.lineWidthRange.addEventListener('input', this.updateLineWidth);
    this.clearButton.addEventListener('click', this.clearEventHandler);

    this.socket.on('drawing', this.onDrawingEvent);
    this.socket.on('history', this.onCanvasHistory);
    this.socket.on('clear', this.clearCanvas);

    window.addEventListener('resize', this.onResize);
    this.onResize();
  }
  this.createDOM = () => {
    const canvas = this.createElement('canvas', { classes: ['whiteboard'] });
    const toolbar = this.createElement('div', { classes: ['toolbar'] });
    const lineWidthContainer = this.createElement('div', { classes: ['line-width-container'] });
    const lineWidthRange = this.createElement('input', { classes: ['line-width'], attribs: [{ name: 'type', value: 'range' }, { name: 'min', value: 1 }, { name: 'max', value: 50 }, { name: 'step', value: 1 }, { name: 'value', value: this.current.size }] });
    const circleContainer = this.createElement('div', { classes: ['circle-container'] });
    const circle = this.createElement('span', { classes: ['circle'] });
    circle.style.width = lineWidthRange.value + 'px';
    circle.style.height = lineWidthRange.value + 'px';
    lineWidthContainer.appendChild(lineWidthRange);
    circleContainer.appendChild(circle);
    lineWidthContainer.appendChild(circleContainer);
    const colors = this.createElement('div', { classes: ['colors'] });
    this.config.colors.forEach(color => {
      let el = this.createElement('div', { classes: ['color'], attribs: [{ name: 'data-color', value: color }] });
      colors.appendChild(el);
    });
    colors.children[0].classList.add('active');
    const clearButton = this.createElement('button', { id: 'clear', text: 'Clear' });
    toolbar.appendChild(clearButton);
    toolbar.appendChild(lineWidthContainer);
    toolbar.appendChild(colors);
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
  this.updateLineWidth = (event) => {
    let size = event.target.value;
    this.lineWidthDisplay.style.width = size + 'px';
    this.lineWidthDisplay.style.height = size + 'px';
    this.current.size = size;
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
    document.querySelector('.color.active').classList.remove('active');
    e.target.classList.add('active');
    this.current.color = e.target.dataset.color;
    this.lineWidthDisplay.style.backgroundColor = e.target.dataset.color;
  }
  this.getMousePos = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
  this.drawLine = (x0, y0, x1, y1, color, size, emit) => {
    this.ctx.beginPath();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = size;
    this.ctx.strokeStyle = color;
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.stroke();
    this.ctx.closePath();

    if (!emit) return;
    const { w, h } = this.getCanvasDimensions();
    this.socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color,
      size
    });
  }
  this.mouseEventHandler = (e) => {
    const coords = this.getMousePos(e);
    switch (e.type) {
      case 'mousedown':
        this.drawing = true;
        this.current.x = coords.x;
        this.current.y = coords.y;
        break;
      case 'mousemove':
        if (!this.drawing) return;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, true);
        this.current.x = coords.x;
        this.current.y = coords.y;
        break;
      default: // mouseup and mouseout
        if (!this.drawing) return;
        this.drawing = false;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, true);
        break;
    }
  }
  this.onDrawingEvent = (data) => {
    const { w, h } = this.getCanvasDimensions();
    this.drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size);
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
    this.element = element;
    this.element.appendChild(this.createDOM());

    this.usernameInput = document.querySelector('.usernameInput');
    this.messages = document.querySelector('.messages');
    this.messageInput = document.querySelector('.messageInput');
    this.loginPage = document.querySelector('.login.page');
    this.chatPage = document.querySelector('.chat.page');
    this.chatToggle = document.querySelector('#chatToggle');

    this.chatToggle.addEventListener('click', this.onChatToggle);

    this.participants = document.querySelector('#numUsers');

    this.usernameInput.value = localStorage.getItem('username') ?
      localStorage.getItem('username') : '';

    this.currentInput = this.usernameInput;
    this.currentInput.focus();

    this.unreadMessages = 0;

    this.socket = io();
    this.addSocketListeners();

    window.addEventListener('keydown', (event) => {
      if (this.element.classList.contains('closed')) return;

      if (this.username && event.keyCode === 27) {
        this.onChatToggle();
      }

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
  this.onChatToggle = (e) => {
    this.flash(this.chatToggle, 'green');
    this.element.classList.toggle('closed');
    if (this.element.classList.contains('closed')) {
      this.chatToggle.textContent = `Open Chat (${this.unreadMessages})`;
    } else {
      this.chatToggle.textContent = `Close Chat`;
      this.unreadMessages = 0;
    }
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
    localStorage.setItem('username', this.username);
    this.chatToggle = document.querySelector('#chatToggle');
    this.chatToggle.disabled = false;
    this.flash(this.chatToggle, 'green');
    this.chatToggle.textContent = 'Open Chat (0)';
    this.element.classList.add('closed');
    this.loginPage.style.display = 'none';
    this.chatPage.style.display = 'block';
    this.currentInput = this.messageInput;

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
  this.flash = (element, color) => {
    element.classList.add('flash', color);
    setTimeout(() => {
      element.classList.remove('flash', color);
    }, 1000);
  }
  this.getUsernameColor = (username) => {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    let index = Math.abs(hash % this.config.colors.length);
    return this.config.colors[index];
  }
  this.updateUnreadMessages = () => {
    if (this.element.classList.contains('closed')) {
      this.unreadMessages++;
      this.chatToggle.textContent = `Open Chat (${this.unreadMessages})`;
      this.flash(this.chatToggle, 'blue');
    }
  }
  this.addSocketListeners = () => {
    // new message
    this.socket.on('new message', (data) => {
      this.addChatMessage(data);
      this.updateUnreadMessages();
    });
    // chat history
    this.socket.on('chatHistory', (data) => {
      data.forEach(msgData => {
        console.log(msgData);
        this.addChatMessage(msgData);
      });
    });
    // user joined
    this.socket.on('user joined', (data) => {
      this.log(data.username + ' joined');
      this.updateUserNum(data);
    });
    // login
    this.socket.on('login', (data) => {
      this.updateUserNum(data);
      this.socket.emit('chatHistory');
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
