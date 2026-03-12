const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Insert 3D container in #platform section
const platformRegex = /(<section id="platform">[\s\S]*?<p class="section-subtitle">[\s\S]*?<\/p>)/;
const newHtml = `$1\n    <div id="gapbot-3d-container" style="width: 100%; height: 400px; position: relative; margin-top: 2rem; border-radius: var(--border-radius); overflow: hidden; background: radial-gradient(circle at center, rgba(0, 255, 194, 0.05), transparent 70%);"></div>`;
html = html.replace(platformRegex, newHtml);

fs.writeFileSync('index.html', html);
console.log('Patched HTML for 3D container.');

// Add ThreeJS init to app.js
let jsCode = fs.readFileSync('app.js', 'utf8');
const jsAppend = `
// Feature 2: 3D GAPbot Wireframe (Three.js)
function init3DGAPbot() {
  const container = document.getElementById('gapbot-3d-container');
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 15;
  camera.position.y = 5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Group to rotate everything
  const robotGroup = new THREE.Group();
  scene.add(robotGroup);

  // Material for wireframe
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ffc2,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });

  // Body (Hexagon-ish shape for hexapod)
  const bodyGeo = new THREE.CylinderGeometry(2, 2.5, 1, 6);
  const body = new THREE.Mesh(bodyGeo, material);
  robotGroup.add(body);

  // Legs (6 legs around the body)
  const numLegs = 6;
  const radius = 2.5;

  for (let i = 0; i < numLegs; i++) {
    const angle = (i / numLegs) * Math.PI * 2;

    // Leg group
    const legGroup = new THREE.Group();

    // Coxa (base joint)
    const coxaGeo = new THREE.BoxGeometry(1.5, 0.5, 0.5);
    const coxa = new THREE.Mesh(coxaGeo, material);
    coxa.position.x = 0.75;
    legGroup.add(coxa);

    // Femur (upper leg)
    const femurGeo = new THREE.BoxGeometry(2, 0.4, 0.4);
    const femur = new THREE.Mesh(femurGeo, material);
    femur.position.x = 2.5;
    femur.rotation.z = Math.PI / 4; // Angle down
    legGroup.add(femur);

    // Tibia (lower leg)
    const tibiaGeo = new THREE.BoxGeometry(2.5, 0.3, 0.3);
    const tibia = new THREE.Mesh(tibiaGeo, material);
    tibia.position.x = 3.5;
    tibia.position.y = -1.5;
    tibia.rotation.z = -Math.PI / 3;
    legGroup.add(tibia);

    // Position and rotate leg around body
    legGroup.position.x = Math.cos(angle) * radius;
    legGroup.position.z = Math.sin(angle) * radius;
    legGroup.rotation.y = -angle; // Point outward

    robotGroup.add(legGroup);
  }

  // Animation Loop
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);

    // Rotate entire robot slowly
    robotGroup.rotation.y += 0.005;

    // Animate legs for walking effect
    time += 0.05;
    robotGroup.children.forEach((child, index) => {
      if (index > 0) { // Skip body (index 0)
        // Simulate walking gait (offset phase based on leg index)
        const phase = (index % 2 === 0) ? 0 : Math.PI;
        child.position.y = Math.sin(time + phase) * 0.3;
      }
    });

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}
`;

jsCode += jsAppend;
fs.writeFileSync('app.js', jsCode);
console.log('Appended 3D code to app.js');
