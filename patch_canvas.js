// Read app.js
const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Replace initCanvas
const startComment = '// Neural Canvas Animation';
const endComment = '// Terminal Boot Sequence';

let newCanvasCode = `// Advanced Swarm Intelligence Particle Network (Canvas)
function initCanvas() {
  const canvas = document.getElementById("neural-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  let width, height;
  let particles = [];
  const particleCount = 150; // More particles for "swarm"
  const maxDistance = 120; // Connection distance

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener("resize", resize);

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.radius = Math.random() * 2 + 1;
      this.baseColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    }

    update() {
      // Mouse interaction - slight attraction
      if (mouseX && mouseY) {
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          this.vx += (dx / dist) * 0.05;
          this.vy += (dy / dist) * 0.05;
        }
      }

      // Flocking / Swarm logic (simple boids)
      let avgVx = 0, avgVy = 0, count = 0;
      particles.forEach(p => {
        if (p === this) return;
        let d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < 50) { // Separation
          this.vx -= (p.x - this.x) * 0.005;
          this.vy -= (p.y - this.y) * 0.005;
        } else if (d < 150) { // Alignment & Cohesion
          avgVx += p.vx;
          avgVy += p.vy;
          count++;
        }
      });
      if (count > 0) {
        this.vx += (avgVx / count - this.vx) * 0.01;
        this.vy += (avgVy / count - this.vy) * 0.01;
      }

      // Speed limit
      let speed = Math.hypot(this.vx, this.vy);
      if (speed > 3) {
        this.vx = (this.vx / speed) * 3;
        this.vy = (this.vy / speed) * 3;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Bounce off walls
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Keep inside bounds softly
      this.x = Math.max(0, Math.min(width, this.x));
      this.y = Math.max(0, Math.min(height, this.y));
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.baseColor;
      // Slight glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.baseColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    // Semi-transparent background for trail effect
    ctx.fillStyle = "rgba(10, 10, 10, 0.2)";
    ctx.fillRect(0, 0, width, height);

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance) {
          ctx.beginPath();
          ctx.strokeStyle = primaryColor;
          // Opacity based on distance
          ctx.globalAlpha = 1 - (dist / maxDistance);
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}

`;

const startIdx = code.indexOf(startComment);
const endIdx = code.indexOf(endComment);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newCanvasCode + code.substring(endIdx);
  fs.writeFileSync('app.js', code);
  console.log('Successfully patched canvas animation.');
} else {
  console.error('Could not find start/end comments for canvas.');
}
