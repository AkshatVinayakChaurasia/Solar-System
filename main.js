import * as THREE from './assets/three.module.js';

// ---- Settings (Lively can change these live, see LivelyProperties.json) ----
const settings = {
    fps: 30,            // idle frame cap — the main lever for keeping the wallpaper light
    quality: 1,         // 0 = battery saver, 1 = balanced, 2 = sharp
    clock24: false,
    showOrbits: true,
    speed: 1,
    cameraDrift: true,
};
const IS_MAC = /Mac/.test(navigator.platform || navigator.userAgent);
const PIXEL_RATIO_CAP = [0.75, IS_MAC ? 1.5 : 1, 2]; // Retina Macs look soft at 1x
// ?still hides the clock and every overlay — used to export clean images for OS wallpaper settings
const STILL = new URLSearchParams(location.search).has('still');
if (STILL) document.body.classList.add('still');
const IDLE_RETURN_MS = 45000;   // zoom back out after this long without interaction
const FREE_LOOK_IDLE_MS = 60000; // leave free-look mode after this long without interaction

// ---- Solar system data ----
// orbit / spin are radians per second of simulation time; texSize caps texture width (saves VRAM)
const BODIES = [
    {
        name: 'Sun', radius: 22, texture: 'sun.jpg', texSize: 1024, distance: 0, orbit: 0, spin: 0.02,
        kicker: 'The star at the centre',
        desc: 'A middle-aged yellow dwarf holding 99.8% of the Solar System’s mass.',
        stats: [['Diameter', '1.39M km'], ['Surface', '5,500 °C'], ['Rotation', '~27 days'], ['Age', '4.6B yrs']],
    },
    {
        name: 'Mercury', radius: 2, texture: 'mercury.jpg', texSize: 1024, distance: 38, orbit: 0.22, spin: 0.03, tilt: 0, bump: 1.2,
        kicker: 'Planet 1 · 0.39 AU from the Sun',
        desc: 'The smallest planet, swinging between 430 °C days and −180 °C nights.',
        stats: [['Diameter', '4,879 km'], ['Day', '176 days'], ['Year', '88 days'], ['Moons', '0']],
    },
    {
        name: 'Venus', radius: 4.3, texture: 'venus_atmosphere.jpg', texSize: 1024, distance: 54, orbit: 0.085, spin: -0.02, tilt: 177,
        atmosphere: { color: 0xffd8a0, rim: 0.7, halo: 0.45 },
        kicker: 'Planet 2 · 0.72 AU from the Sun',
        desc: 'Hidden under thick clouds, the hottest planet spins backwards.',
        stats: [['Diameter', '12,104 km'], ['Day', '117 days'], ['Year', '225 days'], ['Moons', '0']],
    },
    {
        name: 'Earth', radius: 4.6, texture: 'earth.jpg', texSize: 2048, distance: 74, orbit: 0.055, spin: 0.2, tilt: 23.4, moon: true,
        atmosphere: { color: 0x5aa8ff, rim: 1.3, halo: 0.9 },
        kicker: 'Planet 3 · 1 AU from the Sun',
        desc: 'The only world known to host life, with liquid oceans on its surface.',
        stats: [['Diameter', '12,742 km'], ['Day', '24 hours'], ['Year', '365 days'], ['Moons', '1']],
    },
    {
        name: 'Mars', radius: 3.2, texture: 'mars.jpg', texSize: 2048, distance: 94, orbit: 0.044, spin: 0.19, tilt: 25, bump: 1.4,
        atmosphere: { color: 0xff9a6a, rim: 0.45 },
        kicker: 'Planet 4 · 1.52 AU from the Sun',
        desc: 'A cold desert world, home to Olympus Mons, the tallest known volcano.',
        stats: [['Diameter', '6,779 km'], ['Day', '24h 40m'], ['Year', '687 days'], ['Moons', '2']],
    },
    {
        name: 'Jupiter', radius: 12.5, texture: 'jupiter.jpg', texSize: 2048, distance: 152, orbit: 0.012, spin: 0.35, tilt: 3,
        atmosphere: { color: 0xffe2b8, rim: 0.35 },
        kicker: 'Planet 5 · 5.2 AU from the Sun',
        desc: 'The largest planet. Its Great Red Spot is a storm wider than Earth.',
        stats: [['Diameter', '139,820 km'], ['Day', '9h 56m'], ['Year', '11.9 yrs'], ['Moons', '95+']],
    },
    {
        name: 'Saturn', radius: 10.5, texture: 'saturn.jpg', texSize: 1024, distance: 198, orbit: 0.0055, spin: 0.32, tilt: 26.7, rings: true,
        atmosphere: { color: 0xffe6b5, rim: 0.3 },
        kicker: 'Planet 6 · 9.6 AU from the Sun',
        desc: 'Wrapped in bright rings of ice and rock spanning about 280,000 km.',
        stats: [['Diameter', '116,460 km'], ['Day', '10h 33m'], ['Year', '29.4 yrs'], ['Moons', '270+']],
    },
    {
        name: 'Uranus', radius: 7, texture: 'uranus.jpg', texSize: 512, distance: 236, orbit: 0.0025, spin: 0.25, tilt: 97.8,
        atmosphere: { color: 0xa6ecff, rim: 0.9, halo: 0.35 },
        kicker: 'Planet 7 · 19.2 AU from the Sun',
        desc: 'An ice giant tipped on its side, rolling around the Sun.',
        stats: [['Diameter', '50,724 km'], ['Day', '17h 14m'], ['Year', '84 yrs'], ['Moons', '28+']],
    },
    {
        name: 'Neptune', radius: 6.8, texture: 'neptune.jpg', texSize: 1024, distance: 266, orbit: 0.0012, spin: 0.26, tilt: 28.3,
        atmosphere: { color: 0x6f8fff, rim: 1.0, halo: 0.4 },
        kicker: 'Planet 8 · 30.1 AU from the Sun',
        desc: 'The windiest world, with supersonic storms over 2,000 km/h.',
        stats: [['Diameter', '49,244 km'], ['Day', '16h 6m'], ['Year', '165 yrs'], ['Moons', '16']],
    },
];

const MOON = {
    name: 'Moon', radius: 1.25,
    kicker: 'Earth’s moon · 384,400 km away',
    desc: 'Tidally locked, it always shows Earth the same face, and drifts about 3.8 cm farther away each year.',
    stats: [['Diameter', '3,474 km'], ['Day', '29.5 days'], ['Orbit', '27.3 days'], ['Gravity', '1/6 of Earth']],
};

// ---- DOM ----
const $ = (id) => document.getElementById(id);
const ui = {
    clock: $('clock'), time: $('time'), date: $('date'),
    card: $('card'), cardBody: $('card-body'), kicker: $('card-kicker'), name: $('card-name'),
    desc: $('card-desc'), stats: $('card-stats'),
    nav: $('nav'), dots: $('dots'), label: $('hover-label'), welcome: $('welcome'),
    pin: $('pin-pill'), pinName: $('pin-name'), credit: $('credit'),
};

// ---- Clock (ticks once a minute, aligned to the minute boundary) ----
let clockTimer = 0;
function updateClock() {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    ui.time.textContent = settings.clock24 ? `${String(h).padStart(2, '0')}:${m}` : `${h % 12 || 12}:${m}`;
    ui.date.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    clearTimeout(clockTimer);
    clockTimer = setTimeout(updateClock, 60050 - (now.getSeconds() * 1000 + now.getMilliseconds()));
}
updateClock();

// ---- Renderer ----
const canvas = $('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 6000);
camera.position.set(0, 260, 760); // intro: glides in from here

function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, PIXEL_RATIO_CAP[settings.quality] ?? 1));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (starField) starField.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
}

// ---- Asset loading ----
const manager = new THREE.LoadingManager(() => document.body.classList.add('ready'));
setTimeout(() => document.body.classList.add('ready'), 5000); // never stay blank if an asset fails
const imageLoader = new THREE.ImageLoader(manager);

function loadTexture(file, maxWidth = 2048, srgb = true) {
    const tex = new THREE.Texture();
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    imageLoader.load(`./assets/${file}`, (img) => {
        if (img.width > maxWidth) {
            const c = document.createElement('canvas');
            c.width = maxWidth;
            c.height = Math.round(img.height * maxWidth / img.width);
            const ctx = c.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, c.width, c.height);
            tex.image = c;
        } else {
            tex.image = img;
        }
        tex.needsUpdate = true;
    });
    return tex;
}

function radialTexture(stops, size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
}

// ---- Backdrop: deep-space gradient, dithered so dark tones don't band ----
function makeBackdrop() {
    const w = 640, h = 360;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#03040b';
    ctx.fillRect(0, 0, w, h);
    const glow = (x, y, r, color) => {
        const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    };
    glow(0.5, 0.62, 0.62, 'rgba(38, 46, 104, 0.55)');
    glow(0.12, 0.08, 0.5, 'rgba(76, 42, 128, 0.32)');
    glow(0.92, 0.9, 0.45, 'rgba(18, 74, 112, 0.3)');
    const data = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < data.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 3;
        data.data[i] += n; data.data[i + 1] += n; data.data[i + 2] += n;
    }
    ctx.putImageData(data, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
scene.background = makeBackdrop();

// ---- Milky Way band (the photo sky, blended softly over the gradient) ----
const milkyWay = new THREE.Mesh(
    new THREE.SphereGeometry(2400, 48, 32),
    new THREE.MeshBasicMaterial({
        map: loadTexture('stars.jpg', 2048),
        side: THREE.BackSide,
        color: 0x7a84b0,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
    })
);
milkyWay.rotation.set(0.5, 0, 0.4);
scene.add(milkyWay);

// ---- Twinkling star field (one draw call, animated entirely on the GPU) ----
let starField = null;
function makeStars(count) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const tints = [[0.72, 0.8, 1], [0.9, 0.94, 1], [1, 1, 1], [1, 0.94, 0.84], [1, 0.84, 0.7]];
    for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const r = 1500 + Math.random() * 500;
        pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
        const bright = Math.pow(Math.random(), 5);
        const tint = tints[Math.floor(Math.random() * tints.length)];
        const k = 0.35 + 0.65 * Math.sqrt(bright);
        col.set([tint[0] * k, tint[1] * k, tint[2] * k], i * 3);
        size[i] = 1.3 + bright * 3.4;
        phase[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: /* glsl */`
            attribute vec3 aColor;
            attribute float aSize;
            attribute float aPhase;
            uniform float uTime;
            uniform float uPixelRatio;
            varying vec3 vColor;
            void main() {
                float twinkle = 0.7 + 0.3 * sin(uTime * (0.5 + aPhase) + aPhase * 6.2831);
                vColor = aColor * twinkle;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * uPixelRatio;
            }`,
        fragmentShader: /* glsl */`
            varying vec3 vColor;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.0, d);
                gl_FragColor = vec4(vColor * a * a, 1.0);
            }`,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
    });
    return new THREE.Points(geo, mat);
}
starField = makeStars(2600);
scene.add(starField);

// ---- Lighting ----
scene.add(new THREE.AmbientLight(0x8a9cd8, 0.45));
scene.add(new THREE.PointLight(0xfff3e6, 3.6, 0, 0));

// ---- Atmosphere shader: a lit Fresnel rim, plus an optional outer halo ----
function atmosphereMaterial(color, strength, halo, sunlit = true) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(color) },
            uStrength: { value: strength },
            uSunlit: { value: sunlit ? 1 : 0 },
        },
        vertexShader: /* glsl */`
            varying vec3 vN;
            varying vec3 vP;
            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vP = wp.xyz;
                vN = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * viewMatrix * wp;
            }`,
        fragmentShader: /* glsl */`
            uniform vec3 uColor;
            uniform float uStrength;
            uniform float uSunlit;
            varying vec3 vN;
            varying vec3 vP;
            void main() {
                vec3 N = normalize(vN);
                vec3 V = normalize(cameraPosition - vP);
                float ndv = dot(N, V);
                ${halo
                    ? 'float glow = pow(clamp(-ndv * 2.4, 0.0, 1.0), 3.0);'
                    : 'float glow = pow(1.0 - max(ndv, 0.0), 2.6);'}
                float day = mix(1.0, smoothstep(-0.35, 0.55, dot(N, normalize(-vP))), uSunlit);
                gl_FragColor = vec4(uColor * glow * day * uStrength, 1.0);
            }`,
        side: halo ? THREE.BackSide : THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
    });
}

// ---- Sun surface: texture detail remapped to a hot gradient, slow boiling drift, limb darkening ----
let sunUniforms = null;
function sunMaterial(map) {
    sunUniforms = { uMap: { value: map }, uTime: { value: 0 } };
    return new THREE.ShaderMaterial({
        uniforms: sunUniforms,
        vertexShader: /* glsl */`
            varying vec2 vUv;
            varying vec3 vN;
            varying vec3 vP;
            void main() {
                vUv = uv;
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vP = wp.xyz;
                vN = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * viewMatrix * wp;
            }`,
        fragmentShader: /* glsl */`
            uniform sampler2D uMap;
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vN;
            varying vec3 vP;
            float lum(vec2 uv) { return dot(texture2D(uMap, uv).rgb, vec3(0.3, 0.55, 0.15)); }
            void main() {
                float a = lum(vUv);
                float b = lum(vUv * vec2(1.7, 1.4) + vec2(uTime * 0.003, uTime * 0.0012));
                float l = a * 0.65 + b * 0.35;
                vec3 col = mix(vec3(0.92, 0.3, 0.03), vec3(1.0, 0.62, 0.16), smoothstep(0.2, 0.5, l));
                col = mix(col, vec3(1.0, 0.9, 0.62), smoothstep(0.5, 0.85, l));
                float mu = max(dot(normalize(vN), normalize(cameraPosition - vP)), 0.0);
                col *= 0.55 + 0.6 * pow(mu, 0.5);
                gl_FragColor = vec4(col * 1.1, 1.0);
                #include <colorspace_fragment>
            }`,
    });
}

// ---- Planet surfaces ----
// Sun position in view space, shared by shaders that need the light direction per pixel
const sunView = { value: new THREE.Vector3() };

// Saturn: shared uniforms so the ring can shade the planet and the planet can shade the ring
const ringShared = {
    uCenter: { value: new THREE.Vector3() },
    uNormal: { value: new THREE.Vector3(0, 1, 0) },
    uInner: { value: 1 },
    uOuter: { value: 2 },
    uRingMap: { value: null },
};

function planetMaterial(data, map) {
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
    if (data.bump) {
        mat.bumpMap = map;
        mat.bumpScale = data.bump;
    }
    if (data.name === 'Earth') earthSurface(mat);
    if (data.rings) ringShadowOnPlanet(mat);
    return mat;
}

// Earth: city lights on the night side only, and a sun glint on the oceans
function earthSurface(mat) {
    mat.emissiveMap = loadTexture('earth_night.jpg', 2048);
    mat.emissive = new THREE.Color(1, 0.8, 0.55);
    mat.emissiveIntensity = 1.8;
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSunView = sunView;
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uSunView;')
            .replace('#include <roughnessmap_fragment>', /* glsl */`
                #include <roughnessmap_fragment>
                float ocean = smoothstep(0.01, 0.045, diffuseColor.b - max(diffuseColor.r, diffuseColor.g));
                roughnessFactor = mix(1.0, 0.3, ocean);`)
            .replace('#include <emissivemap_fragment>', /* glsl */`
                #include <emissivemap_fragment>
                float sunFacing = dot(normal, normalize(uSunView + vViewPosition));
                totalEmissiveRadiance *= smoothstep(0.1, -0.2, sunFacing);`);
    };
}

// Saturn: the rings cast their shadow onto the planet
function ringShadowOnPlanet(mat) {
    mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, ringShared);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', /* glsl */`
                #include <common>
                varying vec3 vWPos;
                uniform vec3 uCenter;
                uniform vec3 uNormal;
                uniform float uInner;
                uniform float uOuter;
                uniform sampler2D uRingMap;`)
            .replace('#include <lights_fragment_end>', /* glsl */`
                #include <lights_fragment_end>
                {
                    vec3 L = normalize(-vWPos);
                    float denom = dot(L, uNormal);
                    float t = abs(denom) > 1e-4 ? dot(uCenter - vWPos, uNormal) / denom : -1.0;
                    if (t > 0.0) {
                        float u = (length(vWPos + L * t - uCenter) - uInner) / (uOuter - uInner);
                        if (u > 0.0 && u < 1.0) {
                            float shade = 1.0 - texture2D(uRingMap, vec2(u, 0.5)).a * 0.8;
                            reflectedLight.directDiffuse *= shade;
                            reflectedLight.directSpecular *= shade;
                        }
                    }
                }`);
    };
}

// Saturn's rings: lit side vs. back-lit side, plus the planet's shadow falling across them
function ringMaterial(map, radius) {
    return new THREE.ShaderMaterial({
        uniforms: {
            ...ringShared,
            uMap: { value: map },
            uRadius: { value: radius },
            uTint: { value: new THREE.Color(0xd8ccb2) },
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            varying vec3 vWPos;
            void main() {
                vUv = uv;
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWPos = wp.xyz;
                gl_Position = projectionMatrix * viewMatrix * wp;
            }`,
        fragmentShader: /* glsl */`
            uniform sampler2D uMap;
            uniform vec3 uCenter;
            uniform vec3 uNormal;
            uniform float uRadius;
            uniform vec3 uTint;
            varying vec2 vUv;
            varying vec3 vWPos;
            void main() {
                vec4 tex = texture2D(uMap, vUv);
                vec3 L = normalize(-vWPos);
                vec3 V = normalize(cameraPosition - vWPos);
                // Does the ray from this point toward the Sun hit the planet?
                vec3 oc = vWPos - uCenter;
                float b = dot(oc, L);
                float h = b * b - (dot(oc, oc) - uRadius * uRadius);
                float shadow = smoothstep(0.0, uRadius * uRadius * 0.08, h) * step(b, 0.0);
                float litSide = dot(uNormal, L) * dot(uNormal, V) > 0.0 ? 1.0 : 0.5;
                vec3 col = tex.rgb * uTint * litSide * (1.0 - shadow * 0.9) * 1.15;
                gl_FragColor = vec4(col, tex.a * 0.96);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
    });
}

// ---- Moon surface ----
// Dusty regolith doesn't darken toward the edge like a matte ball, so a full Moon looks evenly bright
// (Lommel–Seeliger), gets a little brighter when the Sun is right behind you (opposition surge),
// and its night side picks up a faint bluish earthshine. Craters get crisp relief from the texture.
const moonUniforms = {
    uMap: { value: null },
    uEarthPos: { value: new THREE.Vector3() },
};
function moonMaterial(map) {
    moonUniforms.uMap.value = map;
    return new THREE.ShaderMaterial({
        uniforms: moonUniforms,
        vertexShader: /* glsl */`
            varying vec2 vUv;
            varying vec3 vN;
            varying vec3 vP;
            void main() {
                vUv = uv;
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vP = wp.xyz;
                vN = normalize(mat3(modelMatrix) * normal);
                gl_Position = projectionMatrix * viewMatrix * wp;
            }`,
        fragmentShader: /* glsl */`
            uniform sampler2D uMap;
            uniform vec3 uEarthPos;
            varying vec2 vUv;
            varying vec3 vN;
            varying vec3 vP;

            float height(vec2 uv) { return dot(texture2D(uMap, uv).rgb, vec3(0.3333)); }

            // Bump mapping: slope measured across neighbouring texels (so relief looks the same at any zoom),
            // carried to screen space and applied as a real height of RELIEF world units per unit brightness
            const float RELIEF = 0.016;
            vec3 bumpNormal(vec3 N) {
                vec3 dPdx = dFdx(vP), dPdy = dFdy(vP);
                vec2 dUVdx = dFdx(vUv), dUVdy = dFdy(vUv);
                vec2 e = vec2(1.0 / 2048.0, 1.0 / 1024.0);
                vec2 slope = vec2(
                    height(vUv + vec2(e.x, 0.0)) - height(vUv - vec2(e.x, 0.0)),
                    height(vUv + vec2(0.0, e.y)) - height(vUv - vec2(0.0, e.y))
                ) / (2.0 * e);
                float dHx = RELIEF * dot(slope, dUVdx);
                float dHy = RELIEF * dot(slope, dUVdy);
                vec3 r1 = cross(dPdy, N), r2 = cross(N, dPdx);
                float det = dot(dPdx, r1);
                vec3 grad = sign(det) * (dHx * r1 + dHy * r2);
                return normalize(abs(det) * N - grad);
            }

            void main() {
                vec3 albedo = texture2D(uMap, vUv).rgb;
                vec3 Ng = normalize(vN);
                vec3 N = bumpNormal(Ng);
                vec3 L = normalize(-vP);                        // the Sun sits at the origin
                vec3 V = normalize(cameraPosition - vP);
                float mu0 = max(dot(N, L), 0.0);
                float mu = max(dot(Ng, V), 0.0);
                float lommel = mu0 / (mu0 + mu + 1e-4);
                float surge = 1.0 + 0.3 * smoothstep(0.85, 1.0, dot(L, V));
                vec3 col = albedo * vec3(1.0, 0.97, 0.93) * lommel * 2.4 * surge;

                float night = 1.0 - smoothstep(-0.15, 0.2, dot(Ng, L));
                float earthFacing = max(dot(N, normalize(uEarthPos - vP)), 0.0);
                col += albedo * vec3(0.3, 0.42, 0.75) * earthFacing * night * 0.14;   // earthshine
                col += albedo * vec3(0.036, 0.047, 0.099);                            // same faint ambient as the planets

                gl_FragColor = vec4(col, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`,
    });
}

// ---- Asteroid belt ----
const dotTexture = radialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']], 64);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const asteroidBelt = (() => {
    const count = 3200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = 120 + gauss() * 11;
        const a = Math.random() * Math.PI * 2;
        pos.set([Math.cos(a) * r, gauss() * 2.5, Math.sin(a) * r], i * 3);
        const c = 0.4 + Math.random() * 0.45;
        col.set([c, c * 0.93, c * 0.84], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
        size: 0.9, map: dotTexture, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false,
    }));
})();
scene.add(asteroidBelt);

// ---- Bodies ----
const bodies = [];
const hitboxes = [];
const orbits = new THREE.Group();
scene.add(orbits);
let moon = null;
let clouds = null;
let saturnRing = null;

BODIES.forEach((data, index) => {
    const r = data.radius;
    const orbitGroup = new THREE.Group();
    const angle = Math.random() * Math.PI * 2;
    orbitGroup.rotation.y = angle; // place it now, so anything reading positions before the first frame is right
    scene.add(orbitGroup);

    const planetGroup = new THREE.Group();
    planetGroup.position.x = data.distance;
    planetGroup.rotation.y = -angle;
    orbitGroup.add(planetGroup);

    // Axial tilt stays fixed in world space (planetGroup counter-rotates each frame)
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = THREE.MathUtils.degToRad(data.tilt || 0);
    planetGroup.add(tiltGroup);

    const segments = r > 8 ? 64 : 48;
    const geo = new THREE.SphereGeometry(r, segments, Math.round(segments * 0.75));
    const map = loadTexture(data.texture, data.texSize);
    const mat = index === 0 ? sunMaterial(map) : planetMaterial(data, map);
    const mesh = new THREE.Mesh(geo, mat);
    tiltGroup.add(mesh);

    if (data.name === 'Earth') {
        const cloudMap = loadTexture('earth_clouds.jpg', 2048, false);
        clouds = new THREE.Mesh(
            new THREE.SphereGeometry(r * 1.012, 64, 48),
            new THREE.MeshStandardMaterial({ alphaMap: cloudMap, color: 0xffffff, roughness: 1, transparent: true, depthWrite: false })
        );
        tiltGroup.add(clouds);
    }

    if (data.atmosphere) {
        const { color, rim, halo } = data.atmosphere;
        planetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 48, 32), atmosphereMaterial(color, rim, false)));
        if (halo) planetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.14, 48, 32), atmosphereMaterial(color, halo, true)));
    }

    if (index === 0) {
        // Sun: bright limb + camera-facing glow sprites (far cheaper than stacked glow spheres)
        planetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.01, 64, 48), atmosphereMaterial(0xffc27a, 1.4, false, false)));
        const glowMat = (stops, opacity) => new THREE.SpriteMaterial({
            map: radialTexture(stops), blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false, toneMapped: false, opacity,
        });
        // Three soft layers: a bright rim hugging the disc, a warm corona, and a faint wide bloom
        const core = new THREE.Sprite(glowMat([
            [0, 'rgba(255,245,220,1)'], [0.5, 'rgba(255,232,185,0.95)'], [0.6, 'rgba(255,196,120,0.45)'],
            [0.78, 'rgba(255,155,75,0.12)'], [1, 'rgba(255,120,40,0)'],
        ], 0.95));
        core.scale.setScalar(r * 3.6);
        const corona = new THREE.Sprite(glowMat([
            [0, 'rgba(255,205,140,0.5)'], [0.3, 'rgba(255,170,95,0.2)'], [0.6, 'rgba(255,130,60,0.05)'], [1, 'rgba(0,0,0,0)'],
        ], 0.9));
        corona.scale.setScalar(r * 8);
        const bloom = new THREE.Sprite(glowMat([
            [0, 'rgba(255,185,125,0.2)'], [0.4, 'rgba(210,125,85,0.05)'], [1, 'rgba(0,0,0,0)'],
        ], 0.9));
        bloom.scale.setScalar(r * 18);
        core.userData.pulse = [0.6, 0.012, 0];     // [speed, amount, phase] — slow, gentle breathing
        corona.userData.pulse = [0.37, 0.03, 1];
        planetGroup.add(core, corona, bloom);
    }

    if (data.rings) {
        const inner = r * 1.25, outer = r * 2.35;
        const ringGeo = new THREE.RingGeometry(inner, outer, 160, 1);
        // Ring texture is a radial strip: map U to distance from the planet's centre
        const p = ringGeo.attributes.position, uv = ringGeo.attributes.uv, v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i);
            uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
        }
        const ringMap = loadTexture('saturn_ring.png', 1024);
        ringShared.uRingMap.value = ringMap;
        ringShared.uInner.value = inner;
        ringShared.uOuter.value = outer;
        const ring = new THREE.Mesh(ringGeo, ringMaterial(ringMap, r));
        ring.rotation.x = -Math.PI / 2;
        tiltGroup.add(ring);
        saturnRing = { ring, planetGroup };
    }

    if (data.moon) {
        const incline = new THREE.Group();
        incline.rotation.z = THREE.MathUtils.degToRad(5.1);
        const pivot = new THREE.Group();
        const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 48), moonMaterial(loadTexture('moon.jpg', 2048)));
        moonMesh.position.x = 9.5;
        moonMesh.rotation.y = Math.PI; // tidally locked: the near side always faces Earth
        pivot.add(moonMesh);
        incline.add(pivot);
        planetGroup.add(incline);
        moon = { pivot, incline, mesh: moonMesh, earthIndex: index };
    }

    // Invisible, generous hit sphere so small planets are easy to click
    const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r * 1.3, 7), 12, 8), new THREE.MeshBasicMaterial());
    hit.visible = false;
    planetGroup.add(hit);
    hitboxes.push(hit);

    let orbitLine = null;
    if (data.distance > 0) {
        const pts = [];
        for (let i = 0; i < 256; i++) {
            const a = (i / 256) * Math.PI * 2;
            pts.push(new THREE.Vector3(Math.cos(a) * data.distance, 0, Math.sin(a) * data.distance));
        }
        orbitLine = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0xb4c2ff, transparent: true, opacity: 0.16, depthWrite: false })
        );
        orbits.add(orbitLine);
    }

    // Everything drawn for this body except its hit sphere and the Moon (which fades on its own)
    const visuals = planetGroup.children.filter((c) => c !== hit && c !== (moon && moon.incline));
    const body = { data, index, orbitGroup, planetGroup, anchor: planetGroup, mesh, orbitLine, angle, visuals, vis: 1 };
    hit.userData.body = body;
    bodies.push(body);
});

// The Moon is focusable too, but isn't one of the orbiting planets (and has no nav dot)
const moonBody = {
    data: MOON, index: moon.earthIndex, isMoon: true, anchor: moon.mesh, mesh: moon.mesh, orbitLine: null,
    visuals: [moon.mesh], vis: 1,
};
{
    const hit = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshBasicMaterial());
    hit.visible = false;
    moon.mesh.add(hit);
    hit.userData.body = moonBody;
    hitboxes.push(hit);
}
const focusables = [...bodies, moonBody];
focusables.forEach((b) => b.visuals.forEach((o) => { o.userData.baseScale = o.scale.x; }));
const surfaces = focusables.map((b) => {
    b.mesh.userData.body = b;
    return b.mesh;
});

// ---- Navigation dots ----
bodies.forEach((b) => {
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.title = b.data.name;
    dot.setAttribute('aria-label', b.data.name);
    dot.addEventListener('click', () => focus(b));
    ui.dots.appendChild(dot);
    b.dot = dot;
});

// ---- Focus / info card ----
let active = null;
let pinned = false;   // details hidden, camera stays on the body: a single-planet wallpaper
let solo = false;     // close-up: everything else fades away, drag to rotate around the body
let overviewZoom = 1; // scroll-wheel zoom outside free look
let focusZoom = 1;
let targetChangedAt = 0;
let lastInteraction = performance.now();
let boostUntil = 0;
const boost = (ms) => { boostUntil = Math.max(boostUntil, performance.now() + ms); };

function focus(body) {
    if (active === body) return;
    active = body;
    pinned = solo = false;
    focusZoom = 1;
    lastInteraction = performance.now();
    const d = body.data;
    ui.kicker.textContent = d.kicker;
    ui.name.textContent = d.name;
    ui.desc.textContent = d.desc;
    ui.stats.innerHTML = d.stats
        .map(([k, v]) => `<div class="stat"><dt>${k}</dt><dd>${v}</dd></div>`)
        .join('');
    ui.cardBody.classList.remove('swap');
    void ui.cardBody.offsetWidth; // restart the content animation
    ui.cardBody.classList.add('swap');
    syncPanels();
    bodies.forEach((b) => b.dot.classList.toggle('active', b.index === body.index));
    hideWelcome();
    boost(3500);
    if (freeLook) {
        // Fly to the new body but keep the viewing angle the user chose
        orbit.targetDist = d.radius * (body.index === 0 && !body.isMoon ? 8 : d.rings ? 7 : 5.6);
        targetChangedAt = performance.now();
    }
}

function unfocus() {
    if (!active) return;
    active = null;
    pinned = solo = false;
    syncPanels();
    showCredit(); // back in the orbit view: the credit returns even if it was closed
    targetChangedAt = performance.now();
    boost(3500);
    if (freeLook) {
        orbit.targetDist = overviewRadius();
        targetChangedAt = performance.now();
    }
}

function syncPanels() {
    const bare = pinned || solo; // details hidden
    document.body.classList.toggle('focused', !!active);
    document.body.classList.toggle('pinned', pinned);
    document.body.classList.toggle('solo', solo);
    ui.card.classList.toggle('hidden', !active || bare);
    ui.nav.classList.toggle('hidden', !active || bare);
    ui.pin.classList.toggle('hidden', !active || !bare);
    if (active) ui.pinName.textContent = active.data.name;
    // Remember a chosen planet view so it comes back after a restart
    try {
        if (active && bare) localStorage.setItem('ss-pinned', JSON.stringify({ name: active.data.name, solo }));
        else localStorage.removeItem('ss-pinned');
    } catch { /* storage unavailable: the view just won't survive a restart */ }
}

function setPinned(on) {
    pinned = on && !!active;
    if (pinned) solo = false;
    syncPanels();
    lastInteraction = performance.now();
    targetChangedAt = performance.now();
    boost(3000);
}

// Close-up: only this body stays, everything else fades out; drag rotates around it
function soloDistance(body) {
    const r = body.data.radius;
    return r * (body.data.rings ? 8.5 : body.index === 0 && !body.isMoon ? 7.5 : 6.8);
}

function setSolo(on) {
    if (on && !active) return;
    if (on && freeLook) setFreeLook(false);
    solo = on;
    if (on) {
        pinned = false;
        startOrbitFromCamera();
        orbit.targetDist = soloDistance(active);
        if (!(active.index === 0 && !active.isMoon)) {
            // Swing round to the sunlit side (same angle as the focus view, so there's no jump from it)
            active.anchor.getWorldPosition(tmpV);
            tmpOut.copy(tmpV).setY(0).normalize();
            tmpTan.set(-tmpOut.z, 0, tmpOut.x);
            tmpOut.multiplyScalar(-0.75).addScaledVector(tmpTan, 0.66);
            orbit.yaw = Math.atan2(tmpOut.x, tmpOut.z);
            orbit.pitch = THREE.MathUtils.degToRad(15);
        }
    }
    syncPanels();
    lastInteraction = performance.now();
    targetChangedAt = performance.now();
    boost(3000);
}

function step(dir) {
    const i = active ? active.index : 0;
    focus(bodies[(i + dir + bodies.length) % bodies.length]);
}

$('card-close').addEventListener('click', unfocus);
$('card-min').addEventListener('click', () => setPinned(true));
$('pin-expand').addEventListener('click', () => { pinned = solo = false; syncPanels(); targetChangedAt = performance.now(); });
$('pin-close').addEventListener('click', unfocus);
$('prev').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));

// ---- First-run welcome: how to use it, shown only once ----
function hideWelcome() {
    ui.welcome.classList.add('hidden');
}
$('welcome-ok').addEventListener('click', hideWelcome);
try {
    if (!STILL && !localStorage.getItem('ss-welcome-v2')) {
        localStorage.setItem('ss-welcome-v2', '1');
        setTimeout(() => { if (!active) ui.welcome.classList.remove('hidden'); }, 2200);
    }
} catch { /* storage unavailable: skip the welcome */ }

// ---- Credit badge: can be hidden, comes back when returning to the orbit view ----
// Closing it keeps it closed (even after a restart) until the user visits a planet and comes back
function showCredit() {
    ui.credit.classList.remove('hidden');
    try { localStorage.removeItem('ss-credit-closed'); } catch { /* ignore */ }
}
$('credit-close').addEventListener('click', () => {
    ui.credit.classList.add('hidden');
    try { localStorage.setItem('ss-credit-closed', '1'); } catch { /* ignore */ }
});
try {
    if (localStorage.getItem('ss-credit-closed')) ui.credit.classList.add('hidden');
} catch { /* ignore */ }

// ---- Input ----
// Plain cursor movement only tilts the view a touch. Double-click and hold the second press,
// then drag, to rotate the view (with inertia); the wheel zooms. In a planet close-up a plain drag rotates.
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointer = { x: 0, y: 0, sx: 0, sy: 0, clientX: -1, clientY: -1, dirty: false };
const drag = { active: false, moved: 0, x: 0, y: 0, time: 0 };
const orbit = { yaw: 0, pitch: 0, dist: 300, targetDist: 300, vYaw: 0, vPitch: 0 };
let freeLook = false;
let clickTimer = 0;

function pick(clientX, clientY) {
    ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const shown = (h) => h.object.userData.body.vis > 0.5;
    const hits = raycaster.intersectObjects(hitboxes, false).filter(shown);
    if (!hits.length) return null;
    // A visible surface under the cursor always wins (so the Moon is clickable right next to Earth);
    // otherwise fall back to the generous hit spheres, where the small Moon gets priority
    const surface = raycaster.intersectObjects(surfaces, false).find(shown);
    if (surface) return surface.object.userData.body;
    const moonHit = hits.find((h) => h.object.userData.body.isMoon);
    return (moonHit || hits[0]).object.userData.body;
}

const onUi = (e) => e.target.closest && e.target.closest('#card, #nav, #pin-pill, #welcome, #credit');

function zoomLimits() {
    if (!active) return [45, 1300];
    const r = active.data.radius;
    if (solo) return [r * (active.data.rings ? 3.2 : 2.2), r * 18];
    if (active.isMoon) return [r * 1.9, r * 60];
    return [r * (active.data.rings ? 3 : 1.9), r * 45];
}

function setFreeLook(on) {
    freeLook = on;
    document.body.classList.toggle('free', on);
    hideWelcome();
    lastInteraction = performance.now();
    boost(2500);
    if (on) startOrbitFromCamera();
}

// Start orbiting from wherever the camera is now, so switching modes never jumps
function startOrbitFromCamera() {
    freeTarget(tmpV);
    tmpOut.subVectors(camera.position, tmpV);
    orbit.dist = orbit.targetDist = tmpOut.length();
    orbit.yaw = Math.atan2(tmpOut.x, tmpOut.z);
    orbit.pitch = Math.asin(THREE.MathUtils.clamp(tmpOut.y / orbit.dist, -1, 1));
    orbit.vYaw = orbit.vPitch = 0;
}

const DOUBLE_PRESS_MS = 400;
let lastUp = { time: -1e9, x: 0, y: 0 };

addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || onUi(e)) return;
    // Second press of a double-click, held down: drag to rotate
    const now = performance.now();
    const secondPress = now - lastUp.time < DOUBLE_PRESS_MS
        && Math.hypot(e.clientX - lastUp.x, e.clientY - lastUp.y) < 30;
    if (secondPress) clearTimeout(clickTimer); // the first click shouldn't fire mid-drag
    drag.active = solo || secondPress;
    drag.moved = 0;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.time = performance.now();
    if (drag.active) {
        orbit.vYaw = orbit.vPitch = 0;
        document.body.classList.add('dragging');
    }
});

addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
    pointer.clientX = e.clientX;
    pointer.clientY = e.clientY;
    pointer.dirty = true;
    lastInteraction = performance.now();
    boost(1200);

    if (drag.active && (e.buttons & 1)) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        const now = performance.now();
        const dt = Math.max((now - drag.time) / 1000, 0.008);
        drag.moved += Math.abs(dx) + Math.abs(dy);
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.time = now;
        if (!solo && !freeLook) {
            if (drag.moved < 5) return;   // ignore hand jitter during an ordinary double-click
            setFreeLook(true);            // start orbiting from the current view
        }
        const dYaw = -dx * 0.0055, dPitch = dy * 0.0045;
        orbit.yaw += dYaw;
        orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dPitch, -1.35, 1.35);
        // Smoothed release velocity, used for inertia after letting go
        orbit.vYaw = orbit.vYaw * 0.5 + (dYaw / dt) * 0.5;
        orbit.vPitch = orbit.vPitch * 0.5 + (dPitch / dt) * 0.5;
    }
});

addEventListener('pointerup', (e) => {
    lastUp = { time: performance.now(), x: e.clientX, y: e.clientY };
    if (!drag.active) return;
    drag.active = false;
    document.body.classList.remove('dragging');
    if (performance.now() - drag.time > 80) orbit.vYaw = orbit.vPitch = 0; // held still before letting go
    boost(2000);
});

// Scroll zooms in every mode
addEventListener('wheel', (e) => {
    if (onUi(e)) return;
    const f = Math.exp(e.deltaY * 0.0011);
    if (freeLook || solo) {
        const [min, max] = zoomLimits();
        orbit.targetDist = THREE.MathUtils.clamp(orbit.targetDist * f, min, max);
    } else if (active) {
        focusZoom = THREE.MathUtils.clamp(focusZoom * f, 0.55, 2.5);
    } else {
        overviewZoom = THREE.MathUtils.clamp(overviewZoom * f, 0.4, 2.2);
    }
    lastInteraction = performance.now();
    boost(1500);
}, { passive: true });

addEventListener('click', (e) => {
    if (onUi(e) || drag.moved > 6) return;
    const { clientX, clientY } = e;
    // Wait briefly so the first half of a double-click doesn't also count as a click
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
        const body = pick(clientX, clientY);
        if (body && body === active) unfocus();      // click the planet you're on → back to the orbit view
        else if (body) focus(body);
        else if (!freeLook && !pinned && !solo) unfocus();
    }, 250);
});

addEventListener('dblclick', (e) => {
    if (onUi(e)) return;
    clearTimeout(clickTimer);
    if (drag.moved > 6) return; // that was a double-click drag, not a double-click
    // On a planet: close-up of just that planet. In the orbit view: back to the normal view.
    if (active) setSolo(!solo);
    else if (freeLook) setFreeLook(false);
});

addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (solo) setSolo(false);
        else if (freeLook) setFreeLook(false);
        else unfocus();
    } else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
});

addEventListener('resize', resize);

// ---- Hover label, pinned just under the hovered planet ----
let hovered = null;
const tmpV = new THREE.Vector3();

function updateHover() {
    if (pointer.dirty && !drag.active) {
        pointer.dirty = false;
        const body = pointer.clientX >= 0 ? pick(pointer.clientX, pointer.clientY) : null;
        hovered = body && body !== active ? body : null;
        document.body.classList.toggle('over-planet', !!body);
        if (hovered) ui.label.textContent = hovered.data.name;
        ui.label.classList.toggle('show', !!hovered);
    }
    if (hovered) {
        hovered.anchor.getWorldPosition(tmpV);
        const dist = tmpV.distanceTo(camera.position);
        tmpV.project(camera);
        const pxRadius = (hovered.data.radius / (dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * innerHeight / 2;
        const x = (tmpV.x + 1) / 2 * innerWidth;
        const y = (1 - tmpV.y) / 2 * innerHeight + pxRadius + 12;
        ui.label.style.transform = `translate3d(${x}px, ${y}px, 0) translateX(-50%)`;
    }
}

// ---- Camera ----
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3();
const lookAt = new THREE.Vector3(0, 0, 0);
const tmpOut = new THREE.Vector3();
const tmpTan = new THREE.Vector3();
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const SNAP = new URLSearchParams(location.search).has('snap'); // previews: skip camera easing

function overviewRadius() {
    // Pull back on narrow / portrait screens so the outer planets stay in frame
    const aspect = camera.aspect;
    return 385 * Math.max(1, Math.pow(1.7 / aspect, 0.85));
}

function freeTarget(v) {
    return active ? active.anchor.getWorldPosition(v) : v.set(0, 0, 0);
}

function updateCamera(dt, t) {
    // Heavily smoothed cursor → a gentle tilt, mostly up/down
    pointer.sx += (pointer.x - pointer.sx) * damp(1.2, dt);
    pointer.sy += (pointer.y - pointer.sy) * damp(1.2, dt);

    if (freeLook || solo) {
        if (!drag.active) {
            orbit.yaw += orbit.vYaw * dt;
            orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + orbit.vPitch * dt, -1.35, 1.35);
            const decay = Math.exp(-3.2 * dt);
            orbit.vYaw *= decay;
            orbit.vPitch *= decay;
            if (Math.abs(orbit.vYaw) + Math.abs(orbit.vPitch) > 0.02) boost(200);
        }
        const [min, max] = zoomLimits();
        orbit.targetDist = THREE.MathUtils.clamp(orbit.targetDist, min, max);
        orbit.dist += (orbit.targetDist - orbit.dist) * damp(6, dt);
        freeTarget(desiredLook);
        const cp = Math.cos(orbit.pitch);
        desiredPos.set(Math.sin(orbit.yaw) * cp, Math.sin(orbit.pitch), Math.cos(orbit.yaw) * cp)
            .multiplyScalar(orbit.dist).add(desiredLook);
        if (solo) desiredLook.y += active.data.radius * 0.35; // sit the body a little lower, under the clock
    } else if (!active) {
        const az = (settings.cameraDrift ? Math.sin(t * 0.03) * 0.2 : 0) + pointer.sx * 0.02;
        const el = THREE.MathUtils.degToRad(23) + pointer.sy * 0.03;
        const R = overviewRadius() * overviewZoom;
        desiredPos.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, Math.cos(az) * Math.cos(el) * R);
        desiredLook.set(0, 16, 0);
    } else {
        const r = active.data.radius;
        active.anchor.getWorldPosition(tmpV);
        if (active.index === 0 && !active.isMoon) {
            desiredPos.set(pointer.sx * r * 0.2, r * 2.2 + pointer.sy * r * 0.25, r * (pinned ? 9.6 : 8.4)).multiplyScalar(focusZoom);
            desiredLook.set(0, pinned ? r * 0.75 : -r * 0.2, 0);
        } else {
            // View from the Sun-facing side, a little off-axis, for a crisp day/night terminator
            tmpOut.copy(tmpV).setY(0).normalize();
            tmpTan.set(-tmpOut.z, 0, tmpOut.x);
            const fit = Math.max(1, Math.sqrt(900 / innerHeight)); // shorter screens: pull back so the card doesn't cover the planet
            const dist = r * (active.data.rings ? 7 : 5.6) * (pinned ? 1.35 : fit) * focusZoom;
            const el = THREE.MathUtils.degToRad(15);
            const dir = tmpOut.multiplyScalar(-0.75).addScaledVector(tmpTan, 0.66 + pointer.sx * 0.05).normalize();
            desiredPos.copy(tmpV)
                .addScaledVector(dir, dist * Math.cos(el))
                .add(tmpOut.set(0, dist * Math.sin(el) + pointer.sy * r * 0.25, 0));
            desiredLook.copy(tmpV).add(tmpOut.set(0, pinned ? r * 0.7 : -r * 0.4, 0));
        }
    }

    // Free look follows the mouse tightly, but eases gently when flying to a new body
    const flying = performance.now() - targetChangedAt < 1800;
    const k = SNAP ? 1 : damp(freeLook || solo ? (flying ? 2.4 : 7) : active ? 2.2 : 1.4, dt);
    camera.position.lerp(desiredPos, k);
    lookAt.lerp(desiredLook, k);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    sunView.value.set(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
}

// ---- Simulation ----
let timeScale = 1;
const tmpQ = new THREE.Quaternion();

function update(dt, t) {
    timeScale += ((active ? 0.15 : 1) - timeScale) * damp(1.5, dt);
    const simDt = dt * settings.speed * timeScale;

    for (const b of bodies) {
        b.angle += b.data.orbit * simDt;
        b.orbitGroup.rotation.y = b.angle;
        b.planetGroup.rotation.y = -b.angle;
        b.mesh.rotation.y += b.data.spin * simDt;
        if (b.orbitLine) {
            const target = solo ? 0 : active === b ? 0.42 : active ? 0.06 : 0.16;
            b.orbitLine.material.opacity += (target - b.orbitLine.material.opacity) * damp(3, dt);
            b.orbitLine.visible = b.orbitLine.material.opacity > 0.004;
        }
    }

    // Close-up mode: every other body shrinks away smoothly (works for every material type)
    for (const b of focusables) {
        const target = solo && b !== active ? 0 : 1;
        b.vis += (target - b.vis) * damp(5, dt);
        if (Math.abs(target - b.vis) < 0.002) b.vis = target;
        for (const o of b.visuals) {
            const pulse = o.userData.pulse;
            const breathe = pulse ? 1 + Math.sin(t * pulse[0] + pulse[2]) * pulse[1] : 1;
            o.scale.setScalar(o.userData.baseScale * breathe * Math.max(b.vis, 1e-3));
            o.visible = b.vis > 0.005;
        }
    }
    const beltTarget = solo ? 0 : 0.8;
    asteroidBelt.material.opacity += (beltTarget - asteroidBelt.material.opacity) * damp(4, dt);
    asteroidBelt.visible = asteroidBelt.material.opacity > 0.01;
    if (moon) {
        moon.pivot.rotation.y += 0.35 * simDt;
    }
    if (clouds) clouds.rotation.y += 0.035 * simDt;
    if (moon) bodies[moon.earthIndex].planetGroup.getWorldPosition(moonUniforms.uEarthPos.value);
    if (saturnRing) {
        saturnRing.planetGroup.getWorldPosition(ringShared.uCenter.value);
        saturnRing.ring.getWorldQuaternion(tmpQ);
        ringShared.uNormal.value.set(0, 0, 1).applyQuaternion(tmpQ);
    }
    asteroidBelt.rotation.y += 0.006 * simDt;
    milkyWay.rotation.y += 0.002 * dt;
    starField.material.uniforms.uTime.value = t;
    if (sunUniforms) sunUniforms.uTime.value = t;
    orbits.visible = settings.showOrbits;

    const idle = performance.now() - lastInteraction;
    if (freeLook && idle > FREE_LOOK_IDLE_MS) setFreeLook(false);
    if (active && !freeLook && !pinned && !solo && idle > IDLE_RETURN_MS) unfocus();
    document.body.classList.toggle('idle', idle > 2000); // labels and pills fade out after 2 s

    updateCamera(dt, t);
}

// ---- Render loop: frame-capped, fully stopped while hidden or paused ----
let rafId = 0;
let running = false;
let lastRender = 0;
let lastTime = 0;
let pausedByLively = false;

function frame() {
    rafId = requestAnimationFrame(frame);
    // One clock for everything (the rAF timestamp can lag performance.now(), which gave negative steps)
    const now = performance.now();
    const fps = now < boostUntil ? Math.max(settings.fps, 60) : settings.fps;
    if (now - lastRender < 1000 / fps - 1.5) return;
    lastRender = now;
    const dt = THREE.MathUtils.clamp((now - lastTime) / 1000, 0, 0.1);
    lastTime = now;
    update(dt, now / 1000);
    updateHover();
    renderer.render(scene, camera);
}

function syncRunning() {
    const shouldRun = !document.hidden && !pausedByLively;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) {
        lastTime = performance.now();
        updateClock();
        rafId = requestAnimationFrame(frame);
    } else {
        cancelAnimationFrame(rafId);
    }
}
document.addEventListener('visibilitychange', syncRunning);

// ---- Lively Wallpaper hooks ----
window.livelyWallpaperPlaybackChanged = (data) => {
    try {
        pausedByLively = !!JSON.parse(data).IsPaused;
    } catch {
        pausedByLively = false;
    }
    syncRunning();
};

window.livelyPropertyListener = (name, val) => {
    switch (name) {
        case 'fps': settings.fps = Number(val); break;
        case 'quality': settings.quality = Number(val); resize(); break;
        case 'clock24': settings.clock24 = !!val; updateClock(); break;
        case 'showClock': ui.clock.classList.toggle('off', !val); break;
        case 'showOrbits': settings.showOrbits = !!val; break;
        case 'speed': settings.speed = Number(val); break;
        case 'cameraDrift': settings.cameraDrift = !!val; break;
    }
};

// Deep link for previews: index.html#Earth opens focused on that body
const deepLink = focusables.find((b) => b.data.name.toLowerCase() === location.hash.slice(1).toLowerCase());
let savedPin = null;
try { savedPin = JSON.parse(localStorage.getItem('ss-pinned')); } catch { /* ignore */ }
const pinnedBody = savedPin && focusables.find((b) => b.data.name === savedPin.name);

resize();
lastTime = performance.now();
if (deepLink) {
    focus(deepLink);
    const q = new URLSearchParams(location.search);
    if (q.has('pin')) setPinned(true);
    if (q.has('solo')) setSolo(true);
} else if (pinnedBody) {
    focus(pinnedBody);
    if (savedPin.solo) setSolo(true);
    else setPinned(true);
}
syncRunning();

// Preview helper: ?free=<radians> opens in free look, rotated by that angle
const freeParam = new URLSearchParams(location.search).get('free');
if (freeParam !== null) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
        setFreeLook(true);
        orbit.yaw += Number(freeParam) || 0;
        orbit.pitch = 0.12;
    }));
}
