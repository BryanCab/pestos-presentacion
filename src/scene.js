// Escena 3D (Three.js): el plano del restaurante convertido en maqueta con estaciones de monitoreo.
// El scroll mueve el objeto `estado`; el bucle de render lo suaviza y lo aplica a la cámara y a las capas.
//
// Rendimiento (mismo aspecto, menos trabajo):
//  · muros y mobiliario se fusionan en una sola malla (y una sola de aristas) en vez de ~70 objetos;
//  · haces, cabezas, aros, halos y calor son instancias (1 llamada de dibujo cada uno);
//  · cuando el 3D está atenuado por el scroll (casi todo el recorrido) se dibuja a ~30 cuadros y a 1x;
//  · la resolución máxima es 1.5x y el antialias solo se activa en pantallas de baja densidad.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import datos from "./datos.js";
import planoUrl from "../img/plano_oscuro.webp";

const S = 0.01;                                  // 1 unidad de plano = 0.01 unidades de mundo
const wx = (x) => (x - 800) * S;
const wz = (y) => (y - 500) * S;

export const COLORES = {
  cebaderos: "#f59e0b", mecanicas: "#3b82f6", feromona: "#ec4899", uv: "#8b5cf6", otros: "#94a3b8",
};
const ORDEN = ["cebaderos", "mecanicas", "feromona", "uv", "otros"];

// Estado "objetivo" que anima el scroll (ver main.js). Valores de partida = portada.
export const estado = {
  yaw: -0.62, pitch: 0.7, dist: 15.5, tx: 0, tz: 0,
  wall: 0.0, stations: 0.0, heat: 0.0, dim: 1.0, shift: 0.17, shiftY: 0.26,
};

function texturaGlow() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.25, "rgba(255,255,255,.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);

export function crearEscena(canvas, { movil = false, reducir = false } = {}) {
  const dpr = window.devicePixelRatio || 1;
  let prAlto = Math.min(dpr, 1.5);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: dpr < 1.5, powerPreference: "high-performance",
    });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(prAlto);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);
  const plan = new THREE.Group();
  scene.add(plan);

  scene.add(new THREE.AmbientLight(0xbfd2ff, 0.9));
  const sol = new THREE.DirectionalLight(0xffffff, 1.25);
  sol.position.set(5, 10, 4);
  scene.add(sol);

  const glow = texturaGlow();
  const dummy = new THREE.Object3D();

  // ---- suelo: plano holográfico + resplandor + retícula -----------------------
  const loader = new THREE.TextureLoader();
  const texPlano = loader.load(planoUrl);
  texPlano.colorSpace = THREE.SRGBColorSpace;
  texPlano.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 10),
    new THREE.MeshBasicMaterial({ map: texPlano, transparent: true, opacity: 0.96, toneMapped: false }),
  );
  suelo.rotation.x = -Math.PI / 2;
  plan.add(suelo);

  const aura = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 20),
    new THREE.MeshBasicMaterial({
      map: glow, color: 0x4f46e5, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = -0.04;
  plan.add(aura);

  const rejilla = new THREE.GridHelper(60, 120, 0x2a3f8f, 0x121c45);
  rejilla.position.y = -0.05;
  rejilla.material.transparent = true;
  rejilla.material.opacity = 0.45;
  plan.add(rejilla);

  // ---- muros: todos fusionados en una malla + una de aristas -------------------
  const matVidrio = new THREE.MeshBasicMaterial({
    color: 0x38e1ff, transparent: true, opacity: 0.1, depthWrite: false,
  });
  const matBorde = new THREE.LineBasicMaterial({ color: 0x7be9ff, transparent: true, opacity: 0.6 });
  const segH = (x1, x2, y, t = 12) => [(x1 + x2) / 2, y, x2 - x1, t];
  const segV = (x, y1, y2, t = 12) => [x, (y1 + y2) / 2, t, y2 - y1];
  const muros = [
    segH(40, 1560, 40), segH(40, 70, 960), segH(150, 900, 960), segH(1040, 1560, 960),
    segV(40, 40, 160), segV(40, 250, 960), segV(1560, 40, 960),
    segH(40, 60, 520), segH(120, 330, 520), segH(390, 560, 520),
    segV(560, 40, 300), segV(560, 390, 790), segV(560, 850, 960),
    segV(300, 520, 960), segH(300, 560, 760),
    segV(1320, 40, 470, 8), segV(1320, 560, 960, 8),
  ];
  const murosGeo = [], murosAristas = [];
  for (const [cx, cy, w, d] of muros) {
    const g = new THREE.BoxGeometry(w * S, 1, d * S);
    g.translate(wx(cx), 0.5, wz(cy));
    murosGeo.push(g);
    murosAristas.push(new THREE.EdgesGeometry(g));
  }
  const murosGrupo = new THREE.Group();
  murosGrupo.add(
    new THREE.Mesh(mergeGeometries(murosGeo), matVidrio),
    new THREE.LineSegments(mergeGeometries(murosAristas), matBorde),
  );
  plan.add(murosGrupo);

  // ---- mobiliario extruido (una malla con color por vértice) ---------------------
  const mobGrupo = new THREE.Group();
  plan.add(mobGrupo);
  const cajas = [   // [x1, y1, x2, y2, alto, color]
    [80, 60, 380, 130, 0.34, 0x274b86],          // línea caliente
    [80, 230, 370, 294, 0.24, 0x23406f],         // isla 1
    [80, 340, 370, 404, 0.24, 0x23406f],         // isla 2
    [470, 70, 540, 140, 0.5, 0x2c3f73], [470, 150, 540, 220, 0.5, 0x2c3f73],   // refrigeradores
    [80, 445, 240, 501, 0.2, 0x2a4a7a],          // fregadero
    [780, 90, 1120, 146, 0.3, 0x6d3fa8],         // barra
    [640, 820, 800, 864, 0.16, 0x303a78], [1100, 820, 1260, 864, 0.16, 0x303a78],
    [330, 600, 530, 636, 0.42, 0x1f5f86], [330, 650, 530, 686, 0.42, 0x1f5f86], [330, 700, 530, 736, 0.42, 0x1f5f86],
    [80, 620, 260, 658, 0.5, 0x3a3f86], [80, 680, 260, 718, 0.5, 0x3a3f86],
    [80, 740, 260, 778, 0.5, 0x3a3f86], [80, 800, 260, 838, 0.5, 0x3a3f86],
    [1180, 906, 1260, 946, 0.2, 0x7a4a2a],
  ];
  const mobGeo = [], mobAristas = [];
  for (const [x1, y1, x2, y2, h, col] of cajas) {
    const g = new THREE.BoxGeometry((x2 - x1) * S, h, (y2 - y1) * S);
    g.translate(wx((x1 + x2) / 2), h / 2, wz((y1 + y2) / 2));
    const c = new THREE.Color(col);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    mobGeo.push(g);
    mobAristas.push(new THREE.EdgesGeometry(g));
  }
  const matMob = new THREE.MeshLambertMaterial({ vertexColors: true });
  // Mismo resultado que `emissive = color * 0.25` por caja, pero con una sola malla.
  matMob.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.25;",
    );
  };
  mobGrupo.add(
    new THREE.Mesh(mergeGeometries(mobGeo), matMob),
    new THREE.LineSegments(
      mergeGeometries(mobAristas),
      new THREE.LineBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.35 }),
    ),
  );

  const mesasRedondas = [];
  for (const y of [330, 450, 570, 690]) for (const x of [650, 790, 930, 1070, 1210]) mesasRedondas.push([x, y]);
  mesasRedondas.push([1440, 150], [1440, 340], [1440, 440], [1400, 640], [1500, 760]);
  const geoMesa = new THREE.CylinderGeometry(0.23, 0.23, 0.09, 24);
  geoMesa.translate(0, 0.045, 0);
  const mesas = new THREE.InstancedMesh(
    geoMesa, new THREE.MeshLambertMaterial({ color: 0x24357f, emissive: 0x1b2566, emissiveIntensity: 0.45 }),
    mesasRedondas.length,
  );
  mesasRedondas.forEach(([x, y], i) => {
    dummy.position.set(wx(x), 0, wz(y));
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesas.setMatrixAt(i, dummy.matrix);
  });
  mesas.frustumCulled = false;
  mobGrupo.add(mesas);

  // ---- estaciones de monitoreo (instanciadas) ---------------------------------------
  const lista = [...datos.estaciones].sort((a, b) => ORDEN.indexOf(a.grupo) - ORDEN.indexOf(b.grupo));
  const N = lista.length;
  const P = lista.map((e) => ({
    cod: e.cod,
    x: wx(e.x * datos.w / 100),
    z: wz(e.y * datos.h / 100),
    col: new THREE.Color(COLORES[e.grupo]),
    fase: Math.random(),
    act: clamp(e.serie[e.serie.length - 1] / 30),
  }));
  const idxPorCod = Object.fromEntries(P.map((p, i) => [p.cod, i]));

  const geoHaz = new THREE.CylinderGeometry(0.02, 0.02, 1.35, 6);
  geoHaz.translate(0, 0.675, 0);
  const haces = new THREE.InstancedMesh(geoHaz, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 }), N);
  const cabezas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshBasicMaterial(), N);
  const aros = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.12, 0.17, 32),
    new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    N,
  );
  const matHalo = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: glow } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv; varying vec3 vCol;
      void main() {
        vUv = uv;
        vCol = instanceColor;
        vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float s = length(instanceMatrix[0].xyz);
        c.xy += position.xy * s;
        gl_Position = projectionMatrix * c;
      }`,
    fragmentShader: `
      uniform sampler2D mapa; varying vec2 vUv; varying vec3 vCol;
      void main() {
        vec4 t = texture2D(mapa, vUv);
        gl_FragColor = vec4(vCol, t.a);
        #include <colorspace_fragment>
      }`,
  });
  const halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), matHalo, N);
  P.forEach((p, i) => {
    haces.setColorAt(i, p.col);
    cabezas.setColorAt(i, p.col);
    halos.setColorAt(i, p.col);
    aros.setColorAt(i, p.col);
  });
  const estGrupo = new THREE.Group();
  for (const m of [haces, cabezas, aros, halos]) {
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    estGrupo.add(m);
  }
  aros.instanceColor.setUsage(THREE.DynamicDrawUsage);
  plan.add(estGrupo);

  // ---- mapa de calor sobre el suelo (instanciado) ------------------------------------
  const calores = [];
  for (const e of datos.estaciones) {
    const ultima = e.serie[e.serie.length - 1];
    if (!ultima) continue;
    const v = e.grupo === "cebaderos" ? 8 : ultima;
    const t = clamp(v / 36);
    calores.push({
      x: wx(e.x * datos.w / 100), z: wz(e.y * datos.h / 100),
      r: 0.45 + Math.sqrt(v) * 0.13,
      col: new THREE.Color().setHSL(0.13 - t * 0.13, 1, 0.5),    // amarillo -> rojo
    });
  }
  const calor = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    calores.length,
  );
  calores.forEach((c, i) => {
    dummy.position.set(c.x, 0.04, c.z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.setScalar(c.r * 2);
    dummy.updateMatrix();
    calor.setMatrixAt(i, dummy.matrix);
    calor.setColorAt(i, c.col);
  });
  calor.instanceColor.setUsage(THREE.DynamicDrawUsage);
  calor.frustumCulled = false;
  calor.visible = false;
  plan.add(calor);

  // ---- partículas flotantes ------------------------------------------------------------
  const nPart = movil ? 140 : 340;
  const pos = new Float32Array(nPart * 3);
  const col = new Float32Array(nPart * 3);
  const paleta = Object.values(COLORES).map((c) => new THREE.Color(c));
  for (let i = 0; i < nPart; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
    const c = paleta[i % paleta.length];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geoP.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const particulas = new THREE.Points(geoP, new THREE.PointsMaterial({
    size: 0.09, map: glow, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  particulas.frustumCulled = false;
  scene.add(particulas);

  // Objetos estáticos: sin recalcular su matriz en cada cuadro
  for (const o of [suelo, aura, rejilla]) { o.updateMatrix(); o.matrixAutoUpdate = false; }

  // ---- bucle ----------------------------------------------------------------------------------
  const cur = { ...estado };
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  let ancho = 1, alto = 1, destacada = -1, corriendo = true, ultimo = performance.now(), t = 0;
  let nivel = 0, acumDt = 0, cuadros = 0;     // calidad adaptable: baja sola si el equipo va lento
  let prActual = prAlto, opacidadPuesta = -1;

  function fijarResolucion(pr) {
    if (pr === prActual) return;
    prActual = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(ancho, alto, false);
  }
  function redimensionar() {
    ancho = canvas.clientWidth || window.innerWidth;
    alto = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(prActual);
    renderer.setSize(ancho, alto, false);
    camera.aspect = ancho / alto;
    camera.updateProjectionMatrix();
  }
  redimensionar();
  window.addEventListener("resize", redimensionar);
  window.addEventListener("pointermove", (ev) => {
    mouse.x = (ev.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (ev.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    corriendo = !document.hidden;
    ultimo = performance.now();
    if (corriendo) requestAnimationFrame(frame);
  });

  function frame(ahora) {
    if (!corriendo) return;
    requestAnimationFrame(frame);
    const atenuado = cur.dim < 0.4;
    // Con el 3D atenuado (casi todo el recorrido) basta con ~30 cuadros por segundo
    if (atenuado && ahora - ultimo < 30) return;
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    t += dt;
    const k = 1 - Math.exp(-dt * 3.2);
    for (const key of Object.keys(estado)) cur[key] += (estado[key] - cur[key]) * k;

    // invisible por completo: no se actualiza ni se dibuja nada
    if (cur.dim <= 0.02) return;

    // resolución: completa si se ve bien, 1x si está atenuado (histéresis para no parpadear)
    if (atenuado) fijarResolucion(1);
    else if (cur.dim > 0.55) fijarResolucion(nivel >= 1 ? 1 : prAlto);

    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;

    // composición según la forma de la pantalla
    const asp = ancho / alto;
    const vertical = asp < 0.85;
    const factor = asp >= 1.25 ? 1 : asp >= 0.85 ? 1.4 : 1.95;
    const idle = reducir ? 0 : Math.sin(t * 0.12) * 0.18;
    const yaw = cur.yaw + (vertical ? Math.PI / 2 : 0) + idle + mouse.sx * 0.1;
    const pitch = clamp(cur.pitch + mouse.sy * -0.04, 0.2, 1.52);
    const dist = cur.dist * factor;
    camera.position.set(
      cur.tx + Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist,
      cur.tz + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    camera.lookAt(cur.tx, 0, cur.tz);
    const desp = vertical ? 0 : cur.shift;
    const despY = vertical ? cur.shiftY : 0;
    if (Math.abs(desp) > 0.002 || Math.abs(despY) > 0.002) camera.setViewOffset(ancho, alto, -desp * ancho, despY * alto, ancho, alto);
    else camera.clearViewOffset();

    // altura de muros y mobiliario
    murosGrupo.scale.y = Math.max(0.001, cur.wall) * 0.62;
    mobGrupo.scale.y = Math.max(0.001, cur.wall);

    // estaciones: aparecen una a una
    for (let i = 0; i < N; i++) {
      const p = P[i];
      const s = ease(cur.stations * (N + 3) - i);
      const vis = s > 0.001;
      const sc = Math.max(0.001, s);
      const fase = (t * (0.5 + p.act * 0.9) + p.fase) % 1;
      const ref = destacada === i ? 1.9 : 1;

      dummy.rotation.set(0, 0, 0);
      dummy.position.set(p.x, 0, p.z);
      dummy.scale.set(1, sc, 1);
      dummy.updateMatrix();
      haces.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, 1.35 * sc, p.z);
      dummy.updateMatrix();
      cabezas.setMatrixAt(i, dummy.matrix);

      const hs = vis ? (1.15 + Math.sin(t * 3 + i) * 0.1 + p.act * 0.6) * ref : 0.0001;
      dummy.scale.setScalar(hs);
      dummy.updateMatrix();
      halos.setMatrixAt(i, dummy.matrix);

      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.position.set(p.x, 0.03, p.z);
      dummy.scale.setScalar(vis ? (0.6 + fase * (2.2 + p.act * 2.2)) * ref : 0.0001);
      dummy.updateMatrix();
      aros.setMatrixAt(i, dummy.matrix);
      const a = (1 - fase) * 0.9 * s;
      const ac = aros.instanceColor.array;
      ac[i * 3] = p.col.r * a; ac[i * 3 + 1] = p.col.g * a; ac[i * 3 + 2] = p.col.b * a;
    }
    // solo se dibujan las estaciones ya reveladas (aparecen en orden: son un prefijo de la lista)
    const visibles = Math.min(N, Math.max(0, Math.ceil(cur.stations * (N + 3))));
    haces.count = cabezas.count = halos.count = aros.count = visibles;
    haces.instanceMatrix.needsUpdate = true;
    cabezas.instanceMatrix.needsUpdate = true;
    halos.instanceMatrix.needsUpdate = true;
    aros.instanceMatrix.needsUpdate = true;
    aros.instanceColor.needsUpdate = true;

    // calor
    const hayCalor = cur.heat > 0.01;
    calor.visible = hayCalor;
    if (hayCalor) {
      const cc = calor.instanceColor.array;
      for (let i = 0; i < calores.length; i++) {
        const kk = cur.heat * (0.62 + Math.sin(t * 1.4 + i) * 0.1);
        const c = calores[i].col;
        cc[i * 3] = c.r * kk; cc[i * 3 + 1] = c.g * kk; cc[i * 3 + 2] = c.b * kk;
      }
      calor.instanceColor.needsUpdate = true;
    }

    acumDt += dt; cuadros += 1;
    if (cuadros >= 45) {
      const medio = acumDt / cuadros;
      acumDt = 0; cuadros = 0;
      if (medio > 0.045 && nivel < 2 && t > 2 && !atenuado) {
        nivel += 1;
        if (nivel === 1) { prAlto = 1; fijarResolucion(1); }
        if (nivel === 2) { particulas.visible = false; aura.visible = false; rejilla.visible = false; }
      }
    }
    if (!atenuado) {
      particulas.rotation.y = t * 0.012;
      particulas.position.y = Math.sin(t * 0.25) * 0.15;
    }
    aura.material.opacity = 0.35 + 0.2 * (1 - cur.heat);

    const op = clamp(cur.dim, 0, 1);
    if (Math.abs(op - opacidadPuesta) > 0.003) { canvas.style.opacity = String(op); opacidadPuesta = op; }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    estado,
    resaltar(cod) { destacada = cod in idxPorCod ? idxPorCod[cod] : -1; },
    liberar() { corriendo = false; renderer.dispose(); },
    info: renderer.info,
  };
}
