// Escena 3D (Three.js): el plano del restaurante convertido en maqueta con estaciones de monitoreo.
// El scroll mueve el objeto `estado`; el bucle de render lo suaviza y lo aplica a la cámara y a las capas.
import * as THREE from "three";
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

function texturaGlow(color = "#ffffff") {
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
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: !movil, powerPreference: "high-performance",
    });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, movil ? 1.6 : 2));
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

  // ---- suelo: plano holográfico + resplandor + retícula -----------------------
  const loader = new THREE.TextureLoader();
  const texPlano = loader.load(planoUrl);
  texPlano.colorSpace = THREE.SRGBColorSpace;
  texPlano.anisotropy = renderer.capabilities.getMaxAnisotropy();
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

  // ---- muros (segmentos con huecos para las puertas) --------------------------
  const murosGrupo = new THREE.Group();
  plan.add(murosGrupo);
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
  for (const [cx, cy, w, d] of muros) {
    const g = new THREE.BoxGeometry(w * S, 1, d * S);
    g.translate(0, 0.5, 0);
    const m = new THREE.Mesh(g, matVidrio);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), matBorde);
    const grp = new THREE.Group();
    grp.add(m, e);
    grp.position.set(wx(cx), 0, wz(cy));
    murosGrupo.add(grp);
  }

  // ---- mobiliario extruido ------------------------------------------------------
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
  for (const [x1, y1, x2, y2, h, col] of cajas) {
    const g = new THREE.BoxGeometry((x2 - x1) * S, h, (y2 - y1) * S);
    g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.25 }));
    m.position.set(wx((x1 + x2) / 2), 0, wz((y1 + y2) / 2));
    mobGrupo.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.35 }));
    e.position.copy(m.position);
    mobGrupo.add(e);
  }
  const mesasRedondas = [];
  for (const y of [330, 450, 570, 690]) for (const x of [650, 790, 930, 1070, 1210]) mesasRedondas.push([x, y]);
  mesasRedondas.push([1440, 150], [1440, 340], [1440, 440], [1400, 640], [1500, 760]);
  const geoMesa = new THREE.CylinderGeometry(0.23, 0.23, 0.09, 24);
  geoMesa.translate(0, 0.045, 0);
  const mesas = new THREE.InstancedMesh(
    geoMesa, new THREE.MeshLambertMaterial({ color: 0x24357f, emissive: 0x1b2566, emissiveIntensity: 0.45 }),
    mesasRedondas.length,
  );
  const mtx = new THREE.Matrix4();
  mesasRedondas.forEach(([x, y], i) => {
    mtx.makeTranslation(wx(x), 0, wz(y));
    mesas.setMatrixAt(i, mtx);
  });
  mobGrupo.add(mesas);

  // ---- estaciones de monitoreo -----------------------------------------------------
  const estGrupo = new THREE.Group();
  plan.add(estGrupo);
  const lista = [...datos.estaciones].sort((a, b) => ORDEN.indexOf(a.grupo) - ORDEN.indexOf(b.grupo));
  const pines = lista.map((e, i) => {
    const col = new THREE.Color(COLORES[e.grupo]);
    const g = new THREE.Group();
    g.position.set(wx(e.x * datos.w / 100), 0, wz(e.y * datos.h / 100));
    const haz = new THREE.CylinderGeometry(0.02, 0.02, 1.35, 6);
    haz.translate(0, 0.675, 0);
    g.add(new THREE.Mesh(haz, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 })));
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), new THREE.MeshBasicMaterial({ color: col }));
    cabeza.position.y = 1.35;
    g.add(cabeza);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.position.y = 1.35;
    halo.scale.setScalar(1.25);
    g.add(halo);
    const aro = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.17, 40),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.03;
    g.add(aro);
    estGrupo.add(g);
    const ultima = e.serie[e.serie.length - 1];
    return { g, halo, aro, cabeza, i, e, fase: Math.random(), actividad: clamp(ultima / 30) };
  });

  // ---- mapa de calor sobre el suelo ------------------------------------------------
  const calorGrupo = new THREE.Group();
  plan.add(calorGrupo);
  const calores = [];
  for (const e of datos.estaciones) {
    const ultima = e.serie[e.serie.length - 1];
    if (!ultima) continue;
    const v = e.grupo === "cebaderos" ? 8 : ultima;
    const r = 0.45 + Math.sqrt(v) * 0.13;
    const t = clamp(v / 36);
    const col = new THREE.Color().setHSL(0.13 - t * 0.13, 1, 0.5);   // amarillo -> rojo
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({
        map: glow, color: col, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(wx(e.x * datos.w / 100), 0.04, wz(e.y * datos.h / 100));
    calorGrupo.add(m);
    calores.push(m);
  }

  // ---- partículas flotantes ------------------------------------------------------------
  const nPart = movil ? 160 : 420;
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
  scene.add(particulas);

  // ---- bucle ----------------------------------------------------------------------------------
  const cur = { ...estado };
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  let ancho = 1, alto = 1, destacada = null, corriendo = true, ultimo = performance.now(), t = 0;
  let nivel = 0, acumDt = 0, cuadros = 0;     // calidad adaptable: baja sola si el equipo va lento

  function redimensionar() {
    ancho = canvas.clientWidth || window.innerWidth;
    alto = canvas.clientHeight || window.innerHeight;
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
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    t += dt;
    const k = 1 - Math.exp(-dt * 3.2);
    for (const key of Object.keys(estado)) cur[key] += (estado[key] - cur[key]) * k;
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
    const h = Math.max(0.001, cur.wall);
    murosGrupo.children.forEach((c) => (c.scale.y = h * 0.62));
    mobGrupo.scale.y = Math.max(0.001, cur.wall);

    // estaciones: aparecen una a una
    const n = pines.length;
    for (const p of pines) {
      const s = ease(cur.stations * (n + 3) - p.i);
      p.g.visible = s > 0.001;
      p.g.scale.set(1, Math.max(0.001, s), 1);
      const fase = (t * (0.5 + p.actividad * 0.9) + p.fase) % 1;
      const reforzada = destacada === p.e.cod ? 1.9 : 1;
      p.aro.scale.setScalar((0.6 + fase * (2.2 + p.actividad * 2.2)) * reforzada);
      p.aro.material.opacity = (1 - fase) * 0.9 * s;
      p.halo.scale.setScalar((1.15 + Math.sin(t * 3 + p.i) * 0.1 + p.actividad * 0.6) * reforzada);
    }

    // calor
    calores.forEach((m, i) => {
      m.material.opacity = cur.heat * (0.62 + Math.sin(t * 1.4 + i) * 0.1);
      m.visible = cur.heat > 0.01;
    });

    acumDt += dt; cuadros += 1;
    if (cuadros >= 45) {
      const medio = acumDt / cuadros;
      acumDt = 0; cuadros = 0;
      if (medio > 0.045 && nivel < 2 && t > 2) {
        nivel += 1;
        if (nivel === 1) { renderer.setPixelRatio(1); renderer.setSize(ancho, alto, false); }
        if (nivel === 2) { particulas.visible = false; aura.visible = false; rejilla.visible = false; }
      }
    }
    particulas.rotation.y = t * 0.012;
    particulas.position.y = Math.sin(t * 0.25) * 0.15;
    aura.material.opacity = 0.35 + 0.2 * (1 - cur.heat);

    canvas.style.opacity = String(clamp(cur.dim, 0, 1));
    if (cur.dim > 0.02) renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    estado,
    resaltar(cod) { destacada = cod; },
    liberar() { corriendo = false; renderer.dispose(); },
  };
}
