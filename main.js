// The LAKI field: a particle sphere that breathes, follows the pointer and opens into a ring as you scroll.
// Static page underneath; this layer is decoration and stops when hidden or when motion is reduced.
import * as THREE from 'three';

const canvas = document.getElementById('gl');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webgl() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }

if (webgl()) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const N = innerWidth < 768 ? 5000 : 11000;
  const sphere = new Float32Array(N * 3), ring = new Float32Array(N * 3), tone = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 2.6 + (Math.random() - 0.5) * 0.12;
    const s = Math.sqrt(1 - u * u);
    sphere.set([Math.cos(t) * s * r, u * r, Math.sin(t) * s * r], i * 3);
    const a = Math.random() * Math.PI * 2, R = 3.4 + (Math.random() < 0.6 ? 0 : 0.5) + (Math.random() - 0.5) * 0.08;
    ring.set([Math.cos(a) * R, Math.sin(a) * R, (Math.random() - 0.5) * 0.3], i * 3);
    tone[i] = Math.random() < 0.18 ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sphere, 3));
  geo.setAttribute('aRing', new THREE.BufferAttribute(ring, 3));
  geo.setAttribute('aTone', new THREE.BufferAttribute(tone, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uMix: { value: 0 }, uPx: { value: Math.min(devicePixelRatio, 1.75) } },
    vertexShader: `
      uniform float uT, uMix, uPx; attribute vec3 aRing; attribute float aTone; varying float vTone;
      void main() {
        vec3 p = mix(position, aRing, smoothstep(0.0, 1.0, uMix));
        p += 0.05 * vec3(sin(uT * .7 + p.y * 3.), cos(uT * .6 + p.x * 3.), sin(uT * .5 + p.z * 3.));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (aTone > .5 ? 3.2 : 2.0) * uPx * (9.0 / -mv.z);
        gl_Position = projectionMatrix * mv; vTone = aTone;
      }`,
    fragmentShader: `
      varying float vTone;
      void main() {
        float d = length(gl_PointCoord - .5); if (d > .5) discard;
        vec3 c = mix(vec3(.96, .95, .94), vec3(.78, .09, .11), vTone);
        gl_FragColor = vec4(c, smoothstep(.5, .0, d) * (vTone > .5 ? .95 : .5));
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  let mx = 0, my = 0, run = true, last = performance.now(), mix = 0;
  addEventListener('pointermove', (ev) => { mx = ev.clientX / innerWidth - .5; my = ev.clientY / innerHeight - .5; }, { passive: true });
  function size() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, w < 768 ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    pts.position.x = w > 900 ? 2.6 : 0; pts.position.y = w > 900 ? 0 : 1.2;
  }
  size(); addEventListener('resize', size);
  document.addEventListener('visibilitychange', () => { run = !document.hidden; if (run && !reduced) requestAnimationFrame(frame); });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const target = Math.min(1, scrollY / (innerHeight * 1.2));
    mix += (target - mix) * (1 - Math.pow(0.001, dt));
    mat.uniforms.uT.value = now / 1000; mat.uniforms.uMix.value = mix;
    pts.rotation.y += dt * 0.08; pts.rotation.x += ((my * 0.4) - pts.rotation.x) * 0.04;
    pts.rotation.z += ((-mx * 0.3) - pts.rotation.z) * 0.04;
    canvas.style.opacity = String(1 - Math.min(0.75, scrollY / (innerHeight * 3)));
    renderer.render(scene, camera);
    if (run && !reduced) requestAnimationFrame(frame);
  }
  if (reduced) { renderer.render(scene, camera); addEventListener('scroll', () => frame(performance.now()), { passive: true }); }
  else requestAnimationFrame(frame);
}
