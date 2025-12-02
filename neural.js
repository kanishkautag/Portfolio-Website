// neural.js
const canvasContainer = document.getElementById('neural-canvas');

// Scene Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a1b26, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
canvasContainer.appendChild(renderer.domElement);

// --- Post Processing (Bloom) ---
const renderScene = new THREE.RenderPass(scene, camera);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 1.2; // Neon intensity
bloomPass.radius = 0.5;

const composer = new THREE.EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Data & Geometry ---
const particleCount = 1200;
const connectionDistance = 8;
const positions = new Float32Array(particleCount * 3);
const originalPositions = new Float32Array(particleCount * 3); // For "Structure" state
const chaosPositions = new Float32Array(particleCount * 3); // For "Chaos" state
const velocities = [];
const particlesData = [];

// Initialize Chaos State (Random Sphere)
for (let i = 0; i < particleCount; i++) {
    const x = (Math.random() - 0.5) * 100;
    const y = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;

    chaosPositions[i * 3] = x;
    chaosPositions[i * 3 + 1] = y;
    chaosPositions[i * 3 + 2] = z;

    // Initialize structured state (Layers/Brain like)
    // We create 3 distinct layers to represent Input, Hidden, Output
    const layer = i % 3; 
    const spread = 40;
    originalPositions[i * 3] = (Math.random() - 0.5) * spread; // X
    originalPositions[i * 3 + 1] = (layer - 1) * 15 + (Math.random() - 0.5) * 5; // Y (Layers)
    originalPositions[i * 3 + 2] = (Math.random() - 0.5) * spread; // Z

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    velocities.push({
        x: (Math.random() - 0.5) * 0.05,
        y: (Math.random() - 0.5) * 0.05,
        z: (Math.random() - 0.5) * 0.05
    });

    particlesData.push({
        velocity: new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2),
        numConnections: 0
    });
}

// Particle Material (Glowing Dots)
const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particlesMaterial = new THREE.PointsMaterial({
    color: 0xbb9af7, // Tokyo Night Purple
    size: 0.7,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// Lines Geometry (Synapses)
const linesGeometry = new THREE.BufferGeometry();
const linesMaterial = new THREE.LineBasicMaterial({
    color: 0x7dcfff, // Tokyo Night Cyan
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending
});
const lines = new THREE.LineSegments(linesGeometry, linesMaterial);
scene.add(lines);

// --- Interaction State ---
let mouse = new THREE.Vector2();
let targetRotation = { x: 0, y: 0 };
let scrollPercent = 0;
let burstActive = false;
let burstTime = 0;

// Mouse Movement
document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Rotate entire cloud slightly based on mouse
    targetRotation.x = mouse.y * 0.5;
    targetRotation.y = mouse.x * 0.5;
});

// Scroll Evolution
document.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollPercent = window.scrollY / totalHeight;
    // Clamp
    scrollPercent = Math.min(Math.max(scrollPercent, 0), 1);
});

// Click Signal Burst
document.addEventListener('click', () => {
    burstActive = true;
    burstTime = 0;
});

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Smooth Rotation
    particles.rotation.y += 0.001;
    lines.rotation.y += 0.001;
    
    // Mouse Gravity influence
    particles.rotation.x += (targetRotation.x - particles.rotation.x) * 0.05;
    particles.rotation.y += (targetRotation.y - particles.rotation.y) * 0.05;
    lines.rotation.x = particles.rotation.x;
    lines.rotation.y = particles.rotation.y;

    // Burst Logic
    if (burstActive) {
        burstTime += 0.05;
        if (burstTime > Math.PI) burstActive = false;
    }

    let vertexpos = 0;
    let colorpos = 0;
    let numConnected = 0;

    // Reset line positions
    // We only want to draw lines for a subset to save FPS
    const linePositions = new Float32Array(particleCount * 3); // Simplified count
    let lineIndex = 0;

    for (let i = 0; i < particleCount; i++) {
        // 1. Evolution Logic (Lerp between Chaos and Structure based on Scroll)
        // chaosPositions vs originalPositions
        const targetX = chaosPositions[i*3] * (1 - scrollPercent) + originalPositions[i*3] * scrollPercent;
        const targetY = chaosPositions[i*3+1] * (1 - scrollPercent) + originalPositions[i*3+1] * scrollPercent;
        const targetZ = chaosPositions[i*3+2] * (1 - scrollPercent) + originalPositions[i*3+2] * scrollPercent;

        // 2. Physics & Movement
        // Move current position towards target position
        positions[i*3] += (targetX - positions[i*3]) * 0.03; 
        positions[i*3+1] += (targetY - positions[i*3+1]) * 0.03;
        positions[i*3+2] += (targetZ - positions[i*3+2]) * 0.03;

        // Add subtle noise/pulse
        positions[i*3] += Math.sin(Date.now() * 0.001 + i) * 0.02;
        positions[i*3+1] += Math.cos(Date.now() * 0.002 + i) * 0.02;

        // 3. Mouse Attraction (Gravity)
        const dx = mouse.x * 50 - positions[i * 3];
        const dy = mouse.y * 50 - positions[i * 3 + 1];
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 20) {
            positions[i*3] += dx * 0.01;
            positions[i*3+1] += dy * 0.01;
        }

        // 4. Signal Burst (Wave effect)
        if (burstActive) {
            const distanceFromCenter = Math.sqrt(
                positions[i*3]**2 + positions[i*3+1]**2 + positions[i*3+2]**2
            );
            // Create a ripple
            const wave = Math.sin(distanceFromCenter * 0.5 - burstTime * 5);
            if (wave > 0.8) {
                // scale up temporarily
                // This would require modifying point size in shader, 
                // for now we just jitter position to simulate excitement
                positions[i*3] += (Math.random()-0.5) * 0.5;
                positions[i*3+1] += (Math.random()-0.5) * 0.5;
                positions[i*3+2] += (Math.random()-0.5) * 0.5;
            }
        }

        // 5. Connections (Optimize: Only connect if close)
        // Only check connections for the first 300 particles to save FPS
        if (i < 300) {
            for (let j = i + 1; j < 300; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < connectionDistance) {
                    // Add line vertices
                    // We need a bigger buffer for lines usually, but here we just dynamic update a subset
                    // This is a naive implementation for visual effect
                }
            }
        }
    }
    
    // Update Geometry
    particlesGeometry.attributes.position.needsUpdate = true;
    
    // Render using Composer (Bloom)
    composer.render();
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();