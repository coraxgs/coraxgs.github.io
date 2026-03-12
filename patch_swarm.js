const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /class NeuralNetwork \{[\s\S]*?class Particle \{[\s\S]*?\}\s*\}/;

const newCanvasCode = `// Feature 1: Advanced Swarm Intelligence Canvas
class NeuralNetwork {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.numParticles = window.innerWidth < 768 ? 60 : 180; // More particles for swarm
    this.mouse = { x: null, y: null, radius: 250 };

    window.addEventListener('resize', () => this.init());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.x;
      this.mouse.y = e.y;
    });

    this.init();
    this.animate();
  }

  init() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      let x = Math.random() * this.canvas.width;
      let y = Math.random() * this.canvas.height;
      let size = Math.random() * 2 + 1;
      let speedX = (Math.random() - 0.5) * 2;
      let speedY = (Math.random() - 0.5) * 2;
      this.particles.push(new Particle(x, y, speedX, speedY, size, this.ctx, this.canvas, this.mouse, this.particles));
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Trail effect instead of clearRect
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update();
      this.particles[i].draw(primaryColor);
    }

    // Connect particles (Swarm connections)
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        let dx = this.particles[i].x - this.particles[j].x;
        let dy = this.particles[i].y - this.particles[j].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = primaryColor;
          this.ctx.globalAlpha = 1 - (distance / 100);
          this.ctx.lineWidth = 0.5;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
          this.ctx.globalAlpha = 1.0;
        }
      }
    }
  }
}

class Particle {
  constructor(x, y, speedX, speedY, size, ctx, canvas, mouse, allParticles) {
    this.x = x;
    this.y = y;
    this.vx = speedX;
    this.vy = speedY;
    this.size = size;
    this.ctx = ctx;
    this.canvas = canvas;
    this.mouse = mouse;
    this.allParticles = allParticles;
  }

  update() {
    // Mouse attraction (Swarm focus)
    if (this.mouse.x != null && this.mouse.y != null) {
      let dx = this.mouse.x - this.x;
      let dy = this.mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.mouse.radius) {
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let force = (this.mouse.radius - distance) / this.mouse.radius;
        this.vx += forceDirectionX * force * 0.2;
        this.vy += forceDirectionY * force * 0.2;
      }
    }

    // Flocking logic (Boids: Separation, Alignment, Cohesion)
    let separationDist = 30;
    let neighborDist = 120;
    let avgVx = 0, avgVy = 0, count = 0;

    this.allParticles.forEach(p => {
      if (p === this) return;
      let d = Math.hypot(p.x - this.x, p.y - this.y);

      if (d > 0 && d < separationDist) {
        // Separation
        this.vx -= (p.x - this.x) * 0.02;
        this.vy -= (p.y - this.y) * 0.02;
      } else if (d > 0 && d < neighborDist) {
        // Alignment & Cohesion
        avgVx += p.vx;
        avgVy += p.vy;
        count++;
      }
    });

    if (count > 0) {
      avgVx /= count;
      avgVy /= count;
      this.vx += (avgVx - this.vx) * 0.05;
      this.vy += (avgVy - this.vy) * 0.05;
    }

    // Limit speed
    let speed = Math.hypot(this.vx, this.vy);
    let maxSpeed = 3;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Friction
    this.vx *= 0.98;
    this.vy *= 0.98;

    this.x += this.vx;
    this.y += this.vy;

    // Bounce
    if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;

    this.x = Math.max(0, Math.min(this.canvas.width, this.x));
    this.y = Math.max(0, Math.min(this.canvas.height, this.y));
  }

  draw(color) {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = color;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }
}`;

code = code.replace(regex, newCanvasCode);
fs.writeFileSync('app.js', code);
console.log('Patched canvas.');
