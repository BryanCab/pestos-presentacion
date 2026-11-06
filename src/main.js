import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CONFIG, wa, money } from "./config.js";
import datos from "./datos.js";
import { crearEscena, estado, COLORES } from "./scene.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
gsap.ticker.lagSmoothing(0);   // en equipos lentos las animaciones saltan al punto correcto, no van en cámara lenta

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactil = matchMedia("(hover: none)").matches;
const movil = () => innerWidth < 760;
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, html = "") => {
  const e = tag === "svg" || attrs.__svg ? document.createElementNS(NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (k !== "__svg") e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

const NOMBRES = {
  cebaderos: "Cebadero de roedores", mecanicas: "Trampa mecánica", feromona: "Trampa de feromona",
  uv: "Lámpara UV / LED", otros: "Otro dispositivo",
};
const NOMBRES_PLURAL = {
  cebaderos: "Cebaderos de roedores", mecanicas: "Trampas mecánicas", feromona: "Trampas de feromona",
  uv: "Lámparas UV", otros: "Otros dispositivos",
};
const ORDEN = ["cebaderos", "mecanicas", "feromona", "uv", "otros"];

/* ───────────────────────── enlaces de WhatsApp ───────────────────────── */
$$("[data-wa]").forEach((a) => {
  a.href = wa(a.dataset.msg);
  a.target = "_blank";
  a.rel = "noopener";
});
$("#cta-tel").textContent = CONFIG.telefonoVisible;

/* ───────────────────────── escena 3D + keyframes ───────────────────────── */
const escena = crearEscena($("#gl"), { movil: movil(), reducir });
if (!escena) document.documentElement.classList.add("no-webgl");

const K = {
  hero:     { yaw: -0.62, pitch: 0.66, dist: 19, tx: 0, tz: 0, wall: 0.55, stations: 0.4, heat: 0, dim: 1, shift: 0.22 },
  puntos:   { yaw: -0.2, pitch: 0.86, dist: 10.8, tx: -4.4, tz: -1.5, wall: 0.95, stations: 0.3, heat: 0, dim: 1, shift: 0.2 },
  calor:    { yaw: 0.0, pitch: 1.38, dist: 15.5, tx: 0, tz: 0, wall: 0.25, stations: 1, heat: 0.1, dim: 1, shift: -0.18 },
  calorPico:{ yaw: 0.0, pitch: 1.4, dist: 15.5, tx: 0, tz: 0, wall: 0.18, stations: 1, heat: 1, dim: 1, shift: -0.18 },
  flujo:    { yaw: 0.35, pitch: 0.95, dist: 19, tx: 0, tz: 0, wall: 0.5, stations: 1, heat: 0.3, dim: 0.22, shift: 0 },
  offline:  { yaw: 0.9, pitch: 0.8, dist: 21, tx: 1, tz: 0, wall: 0.55, stations: 1, heat: 0, dim: 0.2, shift: 0 },
  roles:    { yaw: 1.4, pitch: 0.85, dist: 22, tx: 0, tz: 0, wall: 0.6, stations: 1, heat: 0, dim: 0.16, shift: 0 },
  docs:     { yaw: 2.0, pitch: 0.95, dist: 21, tx: 0, tz: 0, wall: 0.4, stations: 1, heat: 0.25, dim: 0.16, shift: 0 },
  graf:     { yaw: 2.6, pitch: 1.0, dist: 20, tx: 0, tz: 0, wall: 0.3, stations: 1, heat: 0.4, dim: 0.18, shift: 0 },
  plano:    { yaw: 3.1, pitch: 1.2, dist: 19, tx: 0, tz: 0, wall: 0.3, stations: 1, heat: 0, dim: 0.12, shift: 0 },
  planes:   { yaw: 3.7, pitch: 0.9, dist: 19, tx: 0, tz: 0, wall: 0.5, stations: 1, heat: 0, dim: 0.22, shift: 0 },
  cta:      { yaw: 4.3, pitch: 0.7, dist: 16, tx: 0, tz: 0, wall: 0.6, stations: 1, heat: 0.2, dim: 0.9, shift: 0 },
};
Object.values(K).forEach((k) => { k.shiftY = 0; });
K.hero.shiftY = 0.3; K.puntos.shiftY = 0.24; K.calor.shiftY = 0.24; K.calorPico.shiftY = 0.24;
const SECCIONES = $$("section[data-k]");
const llaves = SECCIONES.map((s) => s.dataset.k);

if (escena) {
  Object.assign(estado, K.hero, { wall: 0, stations: 0, dim: 0 });
  // Entrada: la maqueta se levanta y las estaciones se encienden
  gsap.to(estado, { dim: 1, duration: 1.4, ease: "power2.out" });
  gsap.to(estado, { wall: K.hero.wall, duration: 2.4, delay: 0.3, ease: "power3.out" });
  gsap.to(estado, { stations: K.hero.stations, duration: 2.2, delay: 1.0, ease: "power2.out" });

  const tween = (desde, hasta, trigger, start, end) =>
    gsap.fromTo(estado, { ...desde }, {
      ...hasta, ease: "none", immediateRender: false,
      scrollTrigger: { trigger, start, end, scrub: 1.1 },
    });

  SECCIONES.forEach((sec, i) => {
    const desde = K[llaves[i]];
    const hasta = K[llaves[i + 1]];
    if (!desde || !hasta) return;
    const base = i === 0 ? "top top" : "top 55%";
    if (llaves[i] === "calor") {
      const h = () => sec.offsetHeight;
      tween(desde, K.calorPico, sec, base, () => `top+=${h() * 0.55} 55%`);
      tween(K.calorPico, hasta, sec, () => `top+=${h() * 0.55} 55%`, "bottom 55%");
    } else {
      tween(desde, hasta, sec, base, i === 0 ? "bottom top" : "bottom 55%");
    }
  });
}

/* ───────────────────────── progreso y barra de navegación ───────────────────────── */
const barra = $("#progreso");
const nav = $("#nav");
let yPrev = 0;
addEventListener("scroll", () => {
  const y = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  barra.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  nav.classList.toggle("oculta", y > yPrev && y > 500);
  yPrev = y;
}, { passive: true });

if (!tactil) {
  const glow = $("#cursor");
  addEventListener("pointermove", (e) => {
    glow.style.opacity = 1;
    glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
  }, { passive: true });
}

/* ───────────────────────── titulares animados y reveal ───────────────────────── */
$$("[data-split]").forEach((h) => {
  const palabras = h.textContent.trim().split(/\s+/);
  const nGrad = h.tagName === "H1" ? 3 : 2;
  h.innerHTML = palabras.map((p, i) =>
    `<span class="w"><span class="wi${i >= palabras.length - nGrad ? " grad" : ""}">${p}</span></span>`).join(" ");
  h.setAttribute("aria-label", h.textContent);
  const ws = $$(".wi", h);
  if (reducir) return;
  gsap.set(ws, { yPercent: 118, rotate: 4, opacity: 0 });
  const entrar = () => gsap.to(ws, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.05, stagger: 0.055, ease: "power4.out" });
  if (h.tagName === "H1") gsap.delayedCall(0.35, entrar);
  else ScrollTrigger.create({ trigger: h, start: "top 88%", once: true, onEnter: entrar });
});

const io = new IntersectionObserver((entradas) => {
  entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    const hermanos = $$("[data-r]", en.target.parentElement).filter((x) => x.parentElement === en.target.parentElement);
    const idx = Math.max(0, hermanos.indexOf(en.target));
    en.target.style.transitionDelay = `${Math.min(idx, 5) * 90}ms`;
    en.target.classList.add("vis");
    io.unobserve(en.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
$$("[data-r]").forEach((n) => io.observe(n));

$$("[data-cuenta]").forEach((n) => {
  const fin = +n.dataset.cuenta;
  const o = { v: 0 };
  ScrollTrigger.create({
    trigger: n, start: "top 95%", once: true,
    onEnter: () => gsap.to(o, { v: fin, duration: 1.6, delay: 0.6, ease: "power2.out", onUpdate: () => (n.textContent = Math.round(o.v)) }),
  });
});

/* ───────────────────────── leyenda de puntos (se enciende con el scroll) ───────────────────────── */
{
  const ul = $("#leyenda-puntos");
  const cuentas = {};
  datos.estaciones.forEach((e) => (cuentas[e.grupo] = (cuentas[e.grupo] || 0) + 1));
  ORDEN.forEach((g) => {
    const li = el("li", { style: `--c:${COLORES[g]}` }, `<i></i><span><b>${cuentas[g]}</b> ${NOMBRES_PLURAL[g]}</span>`);
    ul.append(li);
  });
  const items = $$("li", ul);
  const n = datos.estaciones.length;
  gsap.ticker.add(() => {
    const vistas = estado.stations * (n + 3) - 1;
    let acum = 0;
    ORDEN.forEach((g, i) => {
      items[i].classList.toggle("on", vistas > acum + 0.3);
      acum += cuentas[g];
    });
  });
}

/* ───────────────────────── 6 pasos: anillos que se llenan ───────────────────────── */
$$(".paso").forEach((p, i) => {
  if (!reducir) {
    gsap.from(p, {
      y: 60, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: p, start: "top 92%", once: true },
    });
  }
  ScrollTrigger.create({
    trigger: p, start: "top 85%", end: "top 35%", scrub: true,
    onUpdate: (s) => p.style.setProperty("--pct", (s.progress * 100).toFixed(1)),
  });
});

/* ───────────────────────── demo sin internet ───────────────────────── */
{
  const demo = $("#demo-offline");
  const sw = $("#off-sw");
  const estadoTxt = $("#off-estado");
  const cola = $("#off-cola");
  const btn = $("#off-nuevo");
  const clientes = [
    ["Casa Agave", "Servicio quincenal · 20 estaciones"], ["Hotel Boutique Lumbre", "Revisión de lámparas UV"],
    ["Panadería La Espiga", "Monitoreo de moscas"], ["Colegio Nuevo Horizonte", "Preventivo trimestral"],
    ["Bodegas Logísticas del Norte", "Reposición de cebaderos"],
  ];
  let n = 0, sincronizando = false;
  const reloj = () => {
    const d = new Date();
    $("#off-hora").textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  reloj();
  setInterval(reloj, 30000);
  const vacio = () => {
    if (!cola.children.length) cola.append(el("li", { class: "vacio" }, "Sin reportes pendientes"));
  };
  const estaOffline = () => sw.checked;
  function mensaje() {
    demo.classList.toggle("sin-red", estaOffline());
    const pend = $$("li:not(.ok):not(.vacio)", cola).length;
    if (sincronizando) return;
    demo.classList.remove("sync");
    estadoTxt.textContent = estaOffline()
      ? `Sin conexión · ${pend} ${pend === 1 ? "reporte guardado" : "reportes guardados"} en el teléfono`
      : "Conectado · todo al día";
  }
  function agregar() {
    cola.querySelector(".vacio")?.remove();
    const [c, s] = clientes[n++ % clientes.length];
    const li = el("li", {}, `<span class="ic">⏳</span><div><b>${c}</b><small>${s}</small></div>`);
    cola.prepend(li);
    if (estaOffline()) {
      li.querySelector("small").textContent = `${s} · en cola`;
    } else {
      marcarEnviado(li, 600);
    }
    mensaje();
  }
  function marcarEnviado(li, espera = 0) {
    gsap.delayedCall(espera / 1000, () => {
      li.classList.add("env");
      li.querySelector(".ic").textContent = "↻";
      gsap.delayedCall(0.7, () => {
        li.classList.remove("env");
        li.classList.add("ok");
        li.querySelector(".ic").textContent = "✓";
        li.querySelector("small").textContent = "Enviado · sin duplicados";
      });
    });
  }
  function sincronizar() {
    const pend = $$("li:not(.ok):not(.vacio)", cola).reverse();
    if (!pend.length) return mensaje();
    sincronizando = true;
    demo.classList.add("sync");
    estadoTxt.textContent = "Volvió la señal · sincronizando…";
    pend.forEach((li, i) => gsap.delayedCall(i * 0.9, () => marcarEnviado(li)));
    gsap.delayedCall(pend.length * 0.9 + 1, () => {
      sincronizando = false;
      demo.classList.remove("sync");
      estadoTxt.textContent = "Todo enviado · el servidor confirmó cada reporte";
    });
  }
  sw.addEventListener("change", () => { mensaje(); if (!estaOffline()) sincronizar(); });
  btn.addEventListener("click", agregar);
  vacio();
  mensaje();
  let corrido = false;
  ScrollTrigger.create({
    trigger: "#offline", start: "top 55%", once: true,
    onEnter: () => {
      if (corrido) return;
      corrido = true;
      const paso = (t, f) => gsap.delayedCall(t, f);
      paso(0.9, () => { sw.checked = true; mensaje(); });
      paso(1.9, agregar);
      paso(3.0, agregar);
      paso(4.6, () => { sw.checked = false; mensaje(); sincronizar(); });
    },
  });
}

/* ───────────────────────── coverflow de teléfonos ───────────────────────── */
{
  const ROLES = {
    admin: { glow: "rgba(139,92,246,.65)", items: [
      ["admin_dashboard", "Hoy de un vistazo: pendientes, completados y atrasados, con acceso directo al cliente y a su WhatsApp."],
      ["admin_agenda", "La agenda de todo el equipo: reagenda, cancela o abre al cliente sin salir de la lista."],
      ["admin_cliente_analisis", "Cada cliente con su plano real y sus 20 estaciones posicionadas sobre él."],
      ["admin_insumos", "Almacén en ml, gr y pza con lote y caducidad. Compras, bajas y ajustes con historial."],
      ["admin_tecnicos", "Equipo técnico: pasa la agenda completa a otro técnico o devuelve su stock al almacén."],
      ["admin_reportes", "Historial de cada servicio, listo para descargar en PDF con tu marca."],
    ] },
    tecnico: { glow: "rgba(236,72,153,.6)", items: [
      ["tec_inicio", "El técnico ve su día: ruta, horario y un botón grande para iniciar el reporte."],
      ["tec_paso2", "Paso 2 · Diagnóstico: plagas detectadas con toques grandes, pensados para trabajar con guantes."],
      ["tec_paso2_estaciones", "Revisión estación por estación: estado, capturas, organismos y acción realizada."],
    ] },
    cliente: { glow: "rgba(56,225,255,.55)", items: [
      ["portal_inicio", "Portal del cliente con tu marca: historial, contacto directo y solicitud de cita, sin instalar nada."],
      ["portal_scroll", "El cliente consulta sus servicios, documentos y novedades desde un enlace privado."],
    ] },
  };
  const cf = $("#coverflow");
  const texto = $("#cf-texto");
  const puntos = $("#cf-puntos");
  let rol = "admin", idx = 0, fones = [], auto = null, pausadoHasta = 0, visible = false;

  function dibujar(animar = false) {
    cf.innerHTML = "";
    puntos.innerHTML = "";
    const { items, glow } = ROLES[rol];
    fones = items.map(([img], i) => {
      const f = el("div", { class: "fone", tabindex: "-1", style: `--glow:${glow}` });
      f.innerHTML = `<div class="marco"><img src="img/${img}.webp" alt="" ${i < 3 ? "" : 'loading="lazy"'} decoding="async" draggable="false"></div><div class="brillo"></div>`;
      f.addEventListener("click", () => { if (i !== idx) ir(i, true); });
      cf.append(f);
      const d = el("i");
      d.addEventListener("click", () => ir(i, true));
      puntos.append(d);
      return f;
    });
    idx = Math.min(idx, fones.length - 1);
    posicionar(true);
    if (animar) gsap.from(fones, { opacity: 0, y: 60, duration: 0.8, stagger: 0.07, ease: "power3.out" });
  }
  function posicionar(sinTransicion = false) {
    const ancho = fones[0]?.offsetWidth || 260;
    const paso = ancho * (movil() ? 0.52 : 0.64);
    fones.forEach((f, i) => {
      const o = i - idx, a = Math.abs(o);
      f.style.transition = sinTransicion ? "none" : "";
      f.style.transform = `translateX(${o * paso}px) translateZ(${-a * 150}px) rotateY(${-o * 30}deg) scale(${1 - a * 0.05})`;
      f.style.opacity = a > 2 ? 0 : 1 - a * 0.2;
      f.style.zIndex = 50 - a;
      f.style.filter = a === 0 ? "none" : `brightness(${1 - a * 0.22})`;
      f.style.pointerEvents = a > 2 ? "none" : "auto";
    });
    $$("i", puntos).forEach((d, i) => d.classList.toggle("on", i === idx));
    const t = ROLES[rol].items[idx][1];
    texto.style.opacity = 0;
    setTimeout(() => { texto.textContent = t; texto.style.opacity = 1; }, 160);
  }
  function ir(i, manual = false) {
    const n = fones.length;
    idx = (i + n) % n;
    posicionar();
    if (manual) pausadoHasta = Date.now() + 12000;
  }
  $("#cf-prev").addEventListener("click", () => ir(idx - 1, true));
  $("#cf-next").addEventListener("click", () => ir(idx + 1, true));
  $$("#tabs-roles button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.rol === rol) return;
    $$("#tabs-roles button").forEach((x) => x.classList.toggle("on", x === b));
    rol = b.dataset.rol;
    idx = 0;
    pausadoHasta = Date.now() + 12000;
    dibujar(true);
  }));
  // deslizar con el dedo o el mouse
  let x0 = null;
  cf.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 45) ir(idx + (dx < 0 ? 1 : -1), true);
  });
  cf.setAttribute("tabindex", "0");
  cf.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") ir(idx + 1, true);
    if (e.key === "ArrowLeft") ir(idx - 1, true);
  });
  addEventListener("resize", () => posicionar(true));
  ScrollTrigger.create({ trigger: cf, start: "top 85%", end: "bottom 10%", onToggle: (s) => (visible = s.isActive) });
  setInterval(() => { if (visible && Date.now() > pausadoHasta && !document.hidden) ir(idx + 1); }, 4200);
  dibujar();
  ScrollTrigger.create({
    trigger: cf, start: "top 80%", once: true,
    onEnter: () => !reducir && gsap.from(fones, { y: 90, opacity: 0, rotateY: 40, duration: 1.1, stagger: 0.08, ease: "power3.out", clearProps: "opacity,y" }),
  });
}

/* ───────────────────────── documentos: abanico y visor ───────────────────────── */
{
  const DOCS = {
    reporte: { titulo: "Reporte ejecutivo · Casa Agave", total: datos.paginas.reporte, muestra: [1, 3, 5, 6, 8, 9], pdf: "pdf/reporte-ejemplo.pdf" },
    constancia: { titulo: "Constancia de servicio · Casa Agave", total: datos.paginas.constancia, muestra: [1, 2, 3, 4], pdf: "pdf/constancia-ejemplo.pdf" },
  };
  const ab = $("#abanico");
  let doc = "reporte", hojas = [], spread = reducir ? 1 : 0.15;

  function layout() {
    const n = hojas.length, mid = (n - 1) / 2;
    const w = hojas[0]?.offsetWidth || 300;
    hojas.forEach((h, i) => {
      const o = i - mid;
      const x = o * w * (movil() ? 0.34 : 0.5) * spread;
      gsap.set(h, {
        x, y: Math.abs(o) * 12 * spread, z: -Math.abs(o) * 50,
        rotateZ: o * 4.5 * spread, rotateY: -o * 7 * spread, zIndex: 20 - Math.round(Math.abs(o) * 2),
        transformOrigin: "50% 100%",
      });
    });
  }
  function dibujar(animar = false) {
    ab.innerHTML = "";
    const d = DOCS[doc];
    hojas = d.muestra.map((p) => {
      const h = el("button", { class: "hoja", type: "button", "aria-label": `Abrir página ${p} de ${d.titulo}` });
      h.innerHTML = `<img src="img/${doc}_${p}.webp" alt="Página ${p} de ${d.titulo}" ${p > 3 ? 'loading="lazy"' : ""} decoding="async" draggable="false">`;
      h.addEventListener("click", () => abrir(p));
      h.addEventListener("pointerenter", () => !tactil && gsap.to(h, { y: "-=18", duration: 0.3, overwrite: "auto" }));
      h.addEventListener("pointerleave", () => !tactil && layout());
      ab.append(h);
      return h;
    });
    layout();
    $("#doc-pdf").href = d.pdf;
    $("#doc-pdf").setAttribute("download", d.pdf.split("/").pop());
    if (animar) {
      spread = 0.1;
      layout();
      gsap.to({ s: 0.1 }, { s: 1, duration: 1.1, ease: "power3.out", onUpdate() { spread = this.targets()[0].s; layout(); } });
    }
  }
  $$("#tabs-docs button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.doc === doc) return;
    $$("#tabs-docs button").forEach((x) => x.classList.toggle("on", x === b));
    doc = b.dataset.doc;
    dibujar(true);
  }));
  dibujar();
  ScrollTrigger.create({
    trigger: ab, start: "top 90%", end: "center 45%", scrub: reducir ? false : 0.9,
    onUpdate: (s) => { spread = reducir ? 1 : 0.12 + s.progress * 0.88; layout(); },
  });
  addEventListener("resize", layout);

  // visor a pantalla completa
  const visor = $("#visor"), cuerpo = $("#visor-cuerpo"), pag = $("#visor-pag");
  let obs = null, opener = null;
  function abrir(inicio = 1) {
    const d = DOCS[doc];
    opener = document.activeElement;
    cuerpo.innerHTML = "";
    $("#visor-titulo").textContent = d.titulo;
    $("#visor-pdf").href = d.pdf;
    $("#visor-pdf").setAttribute("download", d.pdf.split("/").pop());
    for (let p = 1; p <= d.total; p++) {
      const im = el("img", { src: `img/${doc}_${p}.webp`, alt: `Página ${p} de ${d.total}`, "data-p": p, decoding: "async" });
      cuerpo.append(im);
    }
    visor.hidden = false;
    document.body.classList.add("bloq");
    pag.textContent = `Página ${inicio} de ${d.total}`;
    obs?.disconnect();
    obs = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) pag.textContent = `Página ${e.target.dataset.p} de ${d.total}`;
    }), { root: cuerpo, threshold: 0.5 });
    $$("img", cuerpo).forEach((i) => obs.observe(i));
    requestAnimationFrame(() => {
      const objetivo = cuerpo.children[inicio - 1];
      if (objetivo) cuerpo.scrollTo({ top: objetivo.offsetTop - 80, behavior: "instant" });
    });
    $("#visor-x").focus();
  }
  function cerrar() {
    visor.hidden = true;
    document.body.classList.remove("bloq");
    obs?.disconnect();
    opener?.focus?.();
  }
  $("#doc-ver").addEventListener("click", () => abrir(1));
  $("#visor-x").addEventListener("click", cerrar);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !visor.hidden) cerrar(); });
}

/* ───────────────────────── gráficas ───────────────────────── */
{
  const N = datos.visitas;
  const GR = {
    uv: ["Lámparas UV", COLORES.uv], feromona: ["Feromona", COLORES.feromona],
    mecanicas: ["Mecánicas", COLORES.mecanicas], otros: ["Otros", COLORES.otros],
  };
  const suma = (i) => Object.values(datos.capturas).reduce((a, s) => a + s[i], 0);
  $("#graf-resumen").textContent = `${N} visitas · de ${suma(0)} a ${suma(N - 1)} capturas`;

  const bez = (pts) => {
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  };

  // líneas
  {
    const cont = $("#g-lineas");
    cont.style.position = "relative";
    const W = 640, H = 270, L = 36, R = 14, T = 14, B = 30;
    const max = Math.ceil(Math.max(...Object.values(datos.capturas).flat()) / 40) * 40;
    const X = (i) => L + (i * (W - L - R)) / (N - 1);
    const Y = (v) => T + (1 - v / max) * (H - T - B);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Capturas por tipo de dispositivo en 11 visitas" });
    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k;
      svg.append(svgEl("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "rgba(160,190,255,.12)" }));
      const t = svgEl("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" });
      t.textContent = Math.round(v);
      svg.append(t);
    }
    datos.fechas.forEach((f, i) => {
      if (i % 2) return;
      const t = svgEl("text", { x: X(i), y: H - 8, "text-anchor": "middle" });
      t.textContent = f;
      svg.append(t);
    });
    const defs = svgEl("defs");
    svg.append(defs);
    const lineas = [];
    Object.entries(GR).forEach(([k, [, col]], gi) => {
      const serie = datos.capturas[k];
      if (!serie) return;
      const pts = serie.map((v, i) => [X(i), Y(v)]);
      const g = svgEl("linearGradient", { id: `ga${gi}`, x1: 0, y1: 0, x2: 0, y2: 1 });
      g.append(svgEl("stop", { offset: "0%", "stop-color": col, "stop-opacity": 0.38 }));
      g.append(svgEl("stop", { offset: "100%", "stop-color": col, "stop-opacity": 0 }));
      defs.append(g);
      const area = svgEl("path", { d: `${bez(pts)} L ${X(N - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`, fill: `url(#ga${gi})`, opacity: 0 });
      const path = svgEl("path", { d: bez(pts), fill: "none", stroke: col, "stroke-width": 2.6, "stroke-linecap": "round" });
      const puntosSvg = pts.map(([x, y]) => svgEl("circle", { cx: x, cy: y, r: 3.2, fill: col, opacity: 0 }));
      svg.append(area, path, ...puntosSvg);
      lineas.push({ path, area, puntosSvg });
    });
    const cursor = svgEl("line", { y1: T, y2: H - B, stroke: "rgba(255,255,255,.35)", "stroke-dasharray": "3 4", opacity: 0, class: "punto-cursor" });
    svg.append(cursor);
    cont.append(svg);
    const tip = el("div", { class: "g-tip" });
    cont.append(tip);
    svg.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(N - 1, Math.round(((px - L) / (W - L - R)) * (N - 1))));
      cursor.setAttribute("x1", X(i)); cursor.setAttribute("x2", X(i)); cursor.setAttribute("opacity", 1);
      tip.innerHTML = `<b>${datos.fechas[i]}</b><br>` + Object.entries(GR).filter(([k]) => datos.capturas[k])
        .map(([k, [n, c]]) => `<span style="color:${c}">●</span> ${n}: <b>${datos.capturas[k][i]}</b>`).join("<br>");
      tip.style.left = `${(X(i) / W) * 100}%`;
      tip.style.top = `${(Y(Math.max(...Object.keys(GR).filter((k) => datos.capturas[k]).map((k) => datos.capturas[k][i]))) / H) * 100}%`;
      tip.style.opacity = 1;
    });
    svg.addEventListener("pointerleave", () => { tip.style.opacity = 0; cursor.setAttribute("opacity", 0); });

    $("#g-leyenda").innerHTML = Object.entries(GR).filter(([k]) => datos.capturas[k]).map(([k, [n, c]]) => {
      const s = datos.capturas[k];
      return `<li class="on" style="--c:${c}"><i></i><span><b>${n}</b> ${s[0]} → ${s[N - 1]}</span></li>`;
    }).join("");

    const dibujarLineas = () => {
      lineas.forEach(({ path, area, puntosSvg }, i) => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        if (reducir) { path.style.strokeDashoffset = 0; area.setAttribute("opacity", 1); puntosSvg.forEach((p) => p.setAttribute("opacity", 1)); return; }
        gsap.fromTo(path, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.8, delay: i * 0.18, ease: "power2.inOut" });
        gsap.to(area, { attr: { opacity: 1 }, duration: 1, delay: 1.2 + i * 0.18 });
        gsap.to(puntosSvg, { attr: { opacity: 1 }, duration: 0.4, stagger: 0.08, delay: 0.3 + i * 0.18 });
      });
    };
    lineas.forEach(({ path }) => { const l = path.getTotalLength(); path.style.strokeDasharray = l; path.style.strokeDashoffset = reducir ? 0 : l; });
    ScrollTrigger.create({ trigger: cont, start: "top 82%", once: true, onEnter: dibujarLineas });
  }

  // barras
  const barras = (sel, serie, c1, c2, unidad) => {
    const cont = $(sel);
    const W = 300, H = 190, L = 6, R = 6, T = 22, B = 24;
    const max = Math.max(...serie) * 1.12;
    const bw = (W - L - R) / N;
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Consumo por visita en ${unidad}` });
    const defs = svgEl("defs");
    const g = svgEl("linearGradient", { id: `gb${sel.slice(-3)}`, x1: 0, y1: 0, x2: 0, y2: 1 });
    g.append(svgEl("stop", { offset: "0%", "stop-color": c1 }), svgEl("stop", { offset: "100%", "stop-color": c2 }));
    defs.append(g);
    svg.append(defs);
    svg.append(svgEl("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: "rgba(160,190,255,.2)" }));
    const rects = [];
    serie.forEach((v, i) => {
      const h = (v / max) * (H - T - B);
      const x = L + i * bw + bw * 0.16;
      const r = svgEl("rect", { x, y: H - B - h, width: bw * 0.68, height: Math.max(h, 0), rx: 3, fill: `url(#gb${sel.slice(-3)})`, opacity: v ? 1 : 0.12 });
      r.style.transformOrigin = `${x + bw * 0.34}px ${H - B}px`;
      svg.append(r);
      rects.push(r);
      if (v) {
        const t = svgEl("text", { x: x + bw * 0.34, y: H - B - h - 5, "text-anchor": "middle", style: "font-size:8.5px" });
        t.textContent = v;
        svg.append(t);
      }
      if (i % 2 === 0) {
        const t = svgEl("text", { x: x + bw * 0.34, y: H - 8, "text-anchor": "middle", style: "font-size:8.5px" });
        t.textContent = datos.fechas[i].split(" ")[0] + " " + datos.fechas[i].split(" ")[1].slice(0, 3);
        svg.append(t);
      }
    });
    cont.append(svg);
    if (!reducir) gsap.set(rects, { scaleY: 0 });
    ScrollTrigger.create({
      trigger: cont, start: "top 85%", once: true,
      onEnter: () => !reducir && gsap.to(rects, { scaleY: 1, duration: 1, stagger: 0.07, ease: "elastic.out(1,.65)" }),
    });
  };
  barras("#g-barras-gel", datos.consumo.gel, "#c084fc", "#7c3aed", "gramos");
  barras("#g-barras-ml", datos.consumo.residual, "#38e1ff", "#2563eb", "mililitros");

  // dona
  {
    const items = [["Moscas", 11, "#38e1ff"], ["Cucarachas", 9, "#3b82f6"], ["Mosquitos", 7, "#f59e0b"], ["Roedores", 7, "#8b5cf6"], ["Hormigas", 3, "#ec4899"]];
    const tot = items.reduce((a, b) => a + b[1], 0);
    const R = 52, C = 2 * Math.PI * R;
    const svg = svgEl("svg", { viewBox: "0 0 140 140", role: "img", "aria-label": "Plagas detectadas" });
    let acum = 0;
    const arcos = items.map(([n, v, c]) => {
      const len = (v / tot) * C;
      const ci = svgEl("circle", { cx: 70, cy: 70, r: R, fill: "none", stroke: c, "stroke-width": 20, "stroke-dasharray": `0 ${C}`, "stroke-dashoffset": -acum, transform: "rotate(-90 70 70)" });
      acum += len;
      svg.append(ci);
      return [ci, len];
    });
    const t1 = svgEl("text", { x: 70, y: 70, "text-anchor": "middle", style: "font:700 26px 'Space Grotesk';fill:#fff" });
    t1.textContent = tot;
    const t2 = svgEl("text", { x: 70, y: 87, "text-anchor": "middle", style: "font-size:9px" });
    t2.textContent = "detecciones";
    svg.append(t1, t2);
    $("#g-dona").append(svg);
    $("#g-dona-leyenda").innerHTML = items.map(([n, v, c]) => `<li style="--c:${c}"><i></i>${n}<span>${v} · ${Math.round((v / tot) * 100)}%</span></li>`).join("");
    ScrollTrigger.create({
      trigger: "#g-dona", start: "top 85%", once: true,
      onEnter: () => arcos.forEach(([ci, len], i) => {
        if (reducir) return ci.setAttribute("stroke-dasharray", `${len - 2} ${C}`);
        gsap.to(ci, { attr: { "stroke-dasharray": `${len - 2} ${C}` }, duration: 1.1, delay: i * 0.15, ease: "power2.out" });
      }),
    });
    if (reducir) arcos.forEach(([ci, len]) => ci.setAttribute("stroke-dasharray", `${len - 2} ${C}`));
  }
}

/* ───────────────────────── plano interactivo ───────────────────────── */
{
  const tablero = $("#tablero");
  const capaPines = $("#pines");
  const capaCalor = $("#calor-capa");
  const ruta = $("#ruta");
  const tec = $("#tec");
  const N = datos.visitas;
  const pines = {};
  const activos = new Set(ORDEN);
  let seleccion = null, corriendo = null;

  datos.estaciones.forEach((e, i) => {
    const b = el("button", { class: "pin", type: "button", style: `left:${e.x}%;top:${e.y}%;--c:${COLORES[e.grupo]};--d:${(i % 7) * 0.35}s`, "aria-label": `Estación ${e.cod}, ${NOMBRES[e.grupo]}, ${e.ubic}` });
    b.innerHTML = `<span>${e.cod.replace(/^[A-Z]/, "")}</span>`;
    b.addEventListener("click", () => seleccionar(e.cod, true));
    b.addEventListener("pointerenter", () => escena?.resaltar(e.cod));
    b.addEventListener("pointerleave", () => escena?.resaltar(seleccion));
    capaPines.append(b);
    pines[e.cod] = b;
    const ult = e.serie[N - 1];
    const v = e.grupo === "cebaderos" ? (ult ? 8 : 0) : ult;
    if (v) {
      const d = 9 + Math.sqrt(v) * 3.4;
      capaCalor.append(el("i", { style: `left:${e.x}%;top:${e.y}%;width:${d}%;aspect-ratio:1;--c:${v > 25 ? "#ef4444" : v > 12 ? "#f97316" : v > 5 ? "#facc15" : "#fde047"}` }));
    }
  });

  const filtros = $("#filtros");
  ORDEN.forEach((g) => {
    const b = el("button", { class: "filtro on", type: "button", style: `--c:${COLORES[g]}` }, `<i></i>${NOMBRES_PLURAL[g]}`);
    b.addEventListener("click", () => {
      if (activos.has(g)) activos.delete(g); else activos.add(g);
      b.classList.toggle("on", activos.has(g));
      datos.estaciones.forEach((e) => pines[e.cod].classList.toggle("apagado", !activos.has(e.grupo)));
    });
    filtros.append(b);
  });
  $("#btn-calor").addEventListener("click", (ev) => {
    capaCalor.classList.toggle("on");
    ev.currentTarget.classList.toggle("on");
  });

  const ficha = {
    cod: $("#f-cod"), tipo: $("#f-tipo"), ubic: $("#f-ubic"), ult: $("#f-ult"), tot: $("#f-tot"),
    spark: $("#f-spark"), cuenta: $("#f-cuenta"), caja: $("#ficha"),
  };
  function seleccionar(cod, usuario = false) {
    const e = datos.estaciones.find((x) => x.cod === cod);
    if (!e) return;
    if (usuario && corriendo) detener();
    Object.values(pines).forEach((p) => p.classList.remove("sel"));
    pines[cod].classList.add("sel");
    seleccion = cod;
    escena?.resaltar(cod);
    const ceb = e.grupo === "cebaderos";
    const ult = e.serie[N - 1], tot = e.serie.reduce((a, b) => a + b, 0);
    ficha.cod.textContent = e.cod;
    ficha.tipo.textContent = NOMBRES[e.grupo];
    ficha.caja.style.setProperty("--c", COLORES[e.grupo]);
    ficha.ubic.textContent = e.ubic;
    ficha.ult.textContent = ceb ? (ult ? "Consumo" : "Sin consumo") : `${ult} capt.`;
    ficha.tot.textContent = ceb ? `${tot} de ${N}` : `${tot} capt.`;
    ficha.cuenta.innerHTML = "";
    // minigráfica
    const W = 220, H = 56, m = Math.max(...e.serie, 1);
    const pts = e.serie.map((v, i) => [(i * W) / (N - 1), H - 6 - (v / m) * (H - 14)]);
    ficha.spark.innerHTML = "";
    const col = COLORES[e.grupo];
    const defs = svgEl("defs");
    const g = svgEl("linearGradient", { id: "sp", x1: 0, y1: 0, x2: 0, y2: 1 });
    g.append(svgEl("stop", { offset: "0%", "stop-color": col, "stop-opacity": 0.45 }), svgEl("stop", { offset: "100%", "stop-color": col, "stop-opacity": 0 }));
    defs.append(g);
    const area = svgEl("path", { d: `M ${pts.map((p) => p.join(",")).join(" L ")} L ${W},${H} L 0,${H} Z`, fill: "url(#sp)" });
    const lin = svgEl("polyline", { points: pts.map((p) => p.join(",")).join(" "), fill: "none", stroke: col, "stroke-width": 2.4, "stroke-linejoin": "round" });
    const ul = pts[pts.length - 1];
    const pt = svgEl("circle", { cx: ul[0], cy: ul[1], r: 4.5, fill: "#fff", stroke: col, "stroke-width": 2 });
    ficha.spark.append(defs, area, lin, pt);
    if (!reducir) {
      const len = lin.getTotalLength();
      lin.style.strokeDasharray = len;
      gsap.fromTo(lin, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.8, ease: "power2.out" });
    }
  }

  // recorrido simulado del técnico (vecino más cercano desde la entrada)
  const entrada = { x: 60, y: 96 };
  function orden() {
    const rest = [...datos.estaciones];
    const res = [];
    let cur = entrada;
    while (rest.length) {
      let bi = 0, bd = Infinity;
      rest.forEach((s, i) => {
        const d = Math.hypot(s.x - cur.x, (s.y - cur.y) * 0.62);
        if (d < bd) { bd = d; bi = i; }
      });
      const s = rest.splice(bi, 1)[0];
      res.push(s);
      cur = s;
    }
    return res;
  }
  const btn = $("#btn-recorrido");
  function detener() {
    corriendo?.kill();
    corriendo = null;
    btn.textContent = "▶ Simular recorrido";
    gsap.to(tec, { opacity: 0, duration: 0.3 });
  }
  function recorrer() {
    if (corriendo) return detener();
    if (!activos.size || activos.size < ORDEN.length) {
      activos.clear(); ORDEN.forEach((g) => activos.add(g));
      $$(".filtro", filtros).forEach((f) => f.classList.add("on"));
      Object.values(pines).forEach((p) => p.classList.remove("apagado"));
    }
    Object.values(pines).forEach((p) => p.classList.remove("revisada"));
    ruta.innerHTML = "";
    const path = svgEl("path", { d: "" });
    ruta.append(path);
    const puntos = [entrada, ...orden()];
    const total = puntos.length - 1;
    btn.textContent = "■ Detener";
    const tl = gsap.timeline({ onComplete: () => { btn.textContent = "▶ Repetir recorrido"; corriendo = null; ficha.cuenta.innerHTML = `<b>${total} de ${total}</b> estaciones revisadas. Todo queda registrado en el reporte.`; gsap.to(tec, { opacity: 0, delay: 0.6, duration: 0.5 }); } });
    corriendo = tl;
    gsap.set(tec, { left: `${entrada.x}%`, top: `${entrada.y}%`, opacity: 1 });
    const dibujados = [entrada];
    puntos.slice(1).forEach((p, i) => {
      const prev = puntos[i];
      const dur = Math.max(0.28, Math.hypot(p.x - prev.x, (p.y - prev.y) * 0.62) / 28);
      tl.to(tec, { left: `${p.x}%`, top: `${p.y}%`, duration: dur, ease: "power1.inOut" });
      tl.add(() => {
        dibujados.push(p);
        path.setAttribute("d", "M " + dibujados.map((q) => `${q.x} ${q.y * 0.625}`).join(" L "));
        pines[p.cod].classList.add("revisada");
        seleccionar(p.cod);
        ficha.cuenta.innerHTML = `Revisando… <b>${i + 1} de ${total}</b>`;
      });
      tl.to({}, { duration: 0.22 });
    });
  }
  btn.addEventListener("click", recorrer);
  seleccionar("L01");
  const caja = $(".plano-caja");
  if (!reducir) {
    gsap.from(tablero, {
      rotateX: 18, scale: 0.94, opacity: 0, duration: 1.2, ease: "power3.out", transformPerspective: 1200,
      scrollTrigger: { trigger: caja, start: "top 85%", once: true },
    });
    gsap.fromTo(".pin", { scale: 0 }, {
      scale: 1, duration: 0.6, stagger: 0.05, ease: "back.out(2.2)", clearProps: "transform",
      scrollTrigger: { trigger: caja, start: "top 70%", once: true },
    });
  }
}

/* ───────────────────────── planes ───────────────────────── */
{
  const grid = $("#planes-grid");
  CONFIG.planes.forEach((p) => {
    const card = el("article", { class: `plan glass${p.destacado ? " top" : ""}`, "data-r": "" });
    card.innerHTML = `
      ${p.destacado ? '<span class="insignia">Más elegido</span>' : ""}
      <h3>${p.nombre}</h3>
      <p class="resumen">${p.resumen}</p>
      <div class="precio"><b>${money(p.precio)}</b><span>${CONFIG.moneda}${CONFIG.periodo}</span></div>
      <span class="tecnicos">${p.tecnicos}</span>
      <ul>${CONFIG.incluyen.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a class="btn ${p.destacado ? "btn-wa" : "btn-ghost"} btn-block" target="_blank" rel="noopener"
         href="${wa(`Hola, me interesa el plan ${p.nombre} de PestOS (${money(p.precio)}${CONFIG.periodo})`)}">Elegir ${p.nombre}</a>`;
    grid.append(card);
    io.observe(card);
    if (!tactil && !reducir) {
      const rx = gsap.quickTo(card, "rotateX", { duration: 0.4, ease: "power2.out" });
      const ry = gsap.quickTo(card, "rotateY", { duration: 0.4, ease: "power2.out" });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
      });
      card.addEventListener("pointerleave", () => { rx(0); ry(0); });
    }
  });
  $("#nota-extra").textContent = CONFIG.tecnicoExtra
    ? `¿Necesitas más técnicos? Cada técnico extra cuesta ${money(CONFIG.tecnicoExtra)} ${CONFIG.moneda}${CONFIG.periodo}.` : "";
}

/* ───────────────────────── recorrido guiado (driver.js) ───────────────────────── */
const driverFn = window.driver?.js?.driver;
function iniciarTour() {
  if (!driverFn) return;
  const pasos = [
    { element: "#hero h1", popover: { title: "Esto es PestOS", description: "Un sistema para empresas de control de plagas: de la agenda al PDF que recibe tu cliente. Te lo enseño en un minuto.", side: "bottom", align: "start" } },
    { element: "#card-puntos", popover: { title: "Monitoreo sobre el plano", description: "Cada cliente tiene su plano con cebaderos, trampas y lámparas UV. Aquí se encienden una por una sobre la maqueta.", side: "right" } },
    { element: "#calor .card-narr", popover: { title: "Mapa de calor", description: "Las capturas y el consumo de cebo se suman sobre el plano real. Ves qué zona pide atención antes de entrar.", side: "left" } },
    { element: "#pasos", popover: { title: "Reporte en 6 pasos", description: "El técnico avanza en orden y el servidor valida cada paso. Nadie se salta el diagnóstico ni la firma.", side: "top" } },
    { element: "#demo-offline", popover: { title: "Funciona sin internet", description: "Prueba el interruptor: sin señal el reporte queda en el teléfono y se envía solo al volver la red, sin duplicarse.", side: "left" } },
    { element: "#coverflow", popover: { title: "Pantallas reales", description: "Administrador, técnico y cliente. Desliza o usa las flechas para recorrerlas.", side: "top" } },
    { element: "#abanico", popover: { title: "Documentos listos", description: "El reporte ejecutivo y la constancia con QR salen con tu logo. Toca una hoja para verla completa o descarga el PDF.", side: "top" } },
    { element: "#g-lineas", popover: { title: "Resultados con números", description: "Las gráficas se arman con lo que el técnico ya capturó. Pasa el cursor sobre la línea para ver cada visita.", side: "top" } },
    { element: "#tablero", popover: { title: "Pruébalo tú", description: "Toca una estación, filtra por tipo o pulsa «Simular recorrido» para ver cómo trabaja el técnico.", side: "top" } },
    { element: "#planes-grid", popover: { title: "Planes por técnico", description: "Pagas por técnico; los servicios y las constancias son ilimitados.", side: "top" } },
    { element: "#contacto .cta-card", popover: { title: "¿Hablamos?", description: "Escríbeme por WhatsApp y te lo muestro con tu propio caso.", side: "top" } },
  ].filter((p) => document.querySelector(p.element));
  const d = driverFn({
    showProgress: true, animate: !reducir, smoothScroll: !reducir, allowClose: true,
    overlayColor: "#02030a", overlayOpacity: 0.78, stagePadding: 14, stageRadius: 20,
    nextBtnText: "Siguiente →", prevBtnText: "← Atrás", doneBtnText: "Listo ✓", progressText: "{{current}} de {{total}}",
    steps: pasos,
  });
  d.drive();
}
$("#tour-btn").addEventListener("click", iniciarTour);
$$("[data-tour]").forEach((b) => b.addEventListener("click", iniciarTour));

// Invitación discreta, una sola vez por navegador
if (!leer("pestos_tarjeta_tour")) {
  const toast = el("div", { class: "toast-tour glass", role: "dialog", "aria-label": "Recorrido guiado" },
    `<p><b>¿Te muestro todo en 1 minuto?</b><br>Un recorrido guiado por las pantallas y los documentos.</p>
     <div><button class="btn btn-wa btn-sm" id="tt-si" type="button">Empezar</button><button class="btn btn-ghost btn-sm" id="tt-no" type="button">Ahora no</button></div>`);
  document.body.append(toast);
  const cerrar = () => { toast.classList.remove("on"); guardar("pestos_tarjeta_tour", "1"); setTimeout(() => toast.remove(), 500); };
  setTimeout(() => toast.classList.add("on"), 7000);
  toast.querySelector("#tt-si").addEventListener("click", () => { cerrar(); iniciarTour(); });
  toast.querySelector("#tt-no").addEventListener("click", cerrar);
}

addEventListener("load", () => ScrollTrigger.refresh());
window.__pestos = { estado, K, ScrollTrigger };
