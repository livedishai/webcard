/* ======================================================
   JEWELS-AI | ULTRA FAST DRIVE AR ENGINE
   Optimized Version - Live Drive Sync (No Caching)
   Feature: Auto-Crop (Center-Fill) for 16:9 and 9:16
====================================================== */

const API_KEY = "AIzaSyA_mBu6emRKASkqHpLtwkdBiCQKYO3rvcw";
const FOLDER_ID = "1sGlKlKHzNh_qfyKqIbxql0uYVQtwSLDv";

/* ===============================
   OPTIMIZED CHROMA KEY SHADER
================================ */
AFRAME.registerShader('chromakey', {
  schema: {
    src: { type: 'map' },
    color: { type: 'color', default: '#00FF00' },
    threshold: { type: 'number', default: 0.3 },
    smoothness: { type: 'number', default: 0.05 }
  },

  init: function (data) {
    const videoTexture = new THREE.VideoTexture(data.src);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;
    videoTexture.format = THREE.RGBAFormat;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: videoTexture },
        keyColor: { value: new THREE.Color(data.color) },
        similarity: { value: data.threshold },
        smoothness: { value: data.smoothness }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tex;
        uniform vec3 keyColor;
        uniform float similarity;
        uniform float smoothness;
        varying vec2 vUv;
        void main() {
          vec4 videoColor = texture2D(tex, vUv);
          float diff = distance(videoColor.rgb, keyColor);
          float alpha = smoothstep(similarity, similarity + smoothness, diff);
          
          if (alpha < 0.1) discard; 
          
          gl_FragColor = vec4(videoColor.rgb, alpha);
        }
      `,
      transparent: true
    });
  },

  update: function (data) {
    this.material.uniforms.similarity.value = data.threshold;
    this.material.uniforms.smoothness.value = data.smoothness;
    this.material.uniforms.keyColor.value = new THREE.Color(data.color);
  }
});

/* ===============================
   FRESH DRIVE FETCH (NO CACHE)
================================ */
async function getLatestVideoId() {
  try {
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'video/'&orderBy=modifiedTime desc&pageSize=1&fields=files(id)&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id; 
    }
    return null;
  } catch (error) {
    console.error("Drive Fetch Error:", error);
    return null;
  }
}

/* ===============================
   AR INTERACTION LOGIC
================================ */
window.addEventListener("load", async () => {
  const videoEl = document.querySelector("#driveVideo");
  const videoPlane = document.querySelector("#videoPlane") || document.querySelector("#videoCircle"); 
  const target = document.querySelector("#target1");
  const toggleButton = document.querySelector("#toggleButton");
  const buttonsContainer = document.querySelector("#planButtons");
  const curtain = document.querySelector("#blackCurtain"); 
  const sceneEl = document.querySelector('a-scene');

  let isPlaying = false;

  // Cleanup MindAR UI
  const uiKiller = setInterval(() => {
    const uiElements = document.querySelectorAll('[class^="mindar-ui"], [id^="mindar-ui"]');
    uiElements.forEach(el => el.remove());
  }, 100);

  // --- NEW: AUTO-CROP LOGIC ---
  videoEl.addEventListener('loadedmetadata', () => {
    if (!videoPlane) return;
    
    const videoWidth = videoEl.videoWidth;
    const videoHeight = videoEl.videoHeight;
    const aspectRatio = videoWidth / videoHeight;

    // We are fitting the video into a 1:1 square plane
    if (aspectRatio > 1) { 
      // HORIZONTAL (e.g., 16:9): Crop the left and right edges
      const repeatX = 1 / aspectRatio; 
      const offsetX = (1 - repeatX) / 2;
      videoPlane.setAttribute('material', `repeat: ${repeatX} 1; offset: ${offsetX} 0`);
    } else {
      // VERTICAL (e.g., 9:16): Crop the top and bottom edges
      const repeatY = aspectRatio; 
      const offsetY = (1 - repeatY) / 2;
      videoPlane.setAttribute('material', `repeat: 1 ${repeatY}; offset: 0 ${offsetY}`);
    }
  });

  sceneEl.addEventListener("arReady", () => {
    if (curtain) {
      curtain.style.opacity = "0";
      setTimeout(() => {
        curtain.style.display = "none";
        clearInterval(uiKiller);
      }, 500);
    }
  });

  videoEl.addEventListener('playing', () => {
    if (videoPlane) videoPlane.setAttribute('visible', 'true');
  });

  target.addEventListener("targetFound", async () => {
    buttonsContainer.style.display = "block";
    
    const fileId = await getLatestVideoId();
    if (fileId) {
      const newSrc = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
      
      if (videoEl.src !== newSrc) {
        videoEl.src = newSrc;
        videoEl.load();
      }
    }
  });

  target.addEventListener("targetLost", () => {
    buttonsContainer.style.display = "none";
    videoEl.pause();
    if (videoPlane) videoPlane.setAttribute('visible', 'false'); 
    isPlaying = false;
    toggleButton.textContent = "▶️ Play Video";
  });

  toggleButton.addEventListener("click", async () => {
    try {
      if (!isPlaying) {
        videoEl.muted = false; 
        await videoEl.play();
        toggleButton.textContent = "⏸ Pause Video";
        isPlaying = true;
      } else {
        videoEl.pause();
        toggleButton.textContent = "▶️ Play Video";
        isPlaying = false;
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  });
});

document.addEventListener("contextmenu", (e) => e.preventDefault());