function App() {
  this.initialize = () => {
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
}

let app = new App();
app.initialize();
