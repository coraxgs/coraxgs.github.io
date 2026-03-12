const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /class TiltEffect \{[\s\S]*?\}\s*\}/;

const newTiltCode = `// Feature 5: Holographic 3D Glass Cards (Tilt + Glare)
class TiltEffect {
  constructor() {
    this.cards = document.querySelectorAll('.tilt-card');
    if (!this.cards.length) return;
    this.init();
  }

  init() {
    this.cards.forEach(card => {
      // Add glare element if not exists
      if (!card.querySelector('.tilt-card-glare')) {
        const glare = document.createElement('div');
        glare.className = 'tilt-card-glare';
        card.appendChild(glare);
      }

      card.addEventListener('mousemove', this.handleMouseMove.bind(this));
      card.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'none'; // Snappier follow
        const glare = card.querySelector('.tilt-card-glare');
        if (glare) glare.style.opacity = '1';
      });
    });
  }

  handleMouseMove(e) {
    const card = e.currentTarget;
    const glare = card.querySelector('.tilt-card-glare');
    const rect = card.getBoundingClientRect();

    // Calculate mouse position relative to card center (0 to 1)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (-15deg to +15deg max)
    const rotateX = ((y - centerY) / centerY) * -15; // Invert Y
    const rotateY = ((x - centerX) / centerX) * 15;

    // Apply 3D transform
    card.style.transform = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) scale3d(1.02, 1.02, 1.02)\`;

    // Move Glare gradient opposite to mouse
    if (glare) {
      glare.style.background = \`radial-gradient(circle at \${x}px \${y}px, rgba(255, 255, 255, 0.3) 0%, transparent 60%)\`;
    }
  }

  handleMouseLeave(e) {
    const card = e.currentTarget;
    const glare = card.querySelector('.tilt-card-glare');

    card.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';

    if (glare) {
      glare.style.transition = 'opacity 0.5s ease';
      glare.style.opacity = '0';
    }
  }
}`;

code = code.replace(regex, newTiltCode);
fs.writeFileSync('app.js', code);
console.log('Patched tilt.');
