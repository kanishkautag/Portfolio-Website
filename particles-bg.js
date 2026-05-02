(function () {
  function tuneParticles(material, domElement) {
    var light = document.documentElement.dataset.theme === "light";
    material.opacity = light ? 0.22 : 0.12;
    material.color.setHex(light ? 0xaabbee : 0x62667a);
    if (domElement) domElement.style.opacity = light ? "0.9" : "1";
  }

  function start() {
    var host = document.getElementById("bg-canvas");
    if (!host || typeof THREE === "undefined") return;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    host.innerHTML = "";
    host.appendChild(renderer.domElement);

    var particleCount = 700;
    var positions = new Float32Array(particleCount * 3);
    var geometry = new THREE.BufferGeometry();
    for (var i = 0; i < particleCount; i++) {
      var r = 40 + Math.random() * 20;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    var material = new THREE.PointsMaterial({
      size: 0.65,
      transparent: true,
    });
    tuneParticles(material, renderer.domElement);
    var particles = new THREE.Points(geometry, material);
    scene.add(particles);

    function animate() {
      requestAnimationFrame(animate);
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener("resize", function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener("portfolio-theme", function () {
      tuneParticles(material, renderer.domElement);
    });
  }

  function tryStart() {
    if (typeof THREE === "undefined") return;
    start();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryStart);
  else tryStart();
})();
