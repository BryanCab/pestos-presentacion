// ============================================================================
//  CONFIGURACIÓN DEL SITIO — aquí se cambian los precios, el WhatsApp y los textos
//  de los planes. Después de editar: `npm run build` (en la carpeta pestos-tarjeta).
// ============================================================================
export const CONFIG = {
  whatsapp: "528141540510",            // formato internacional, sin + ni espacios
  telefonoVisible: "+52 814 154 0510",
  mensajeBase: "Hola, quiero conocer PestOS",
  moneda: "MXN",
  periodo: "/mes",

  planes: [
    {
      id: "starter",
      nombre: "Starter",
      precio: 199,
      tecnicos: "1 técnico + administrador",
      resumen: "Para arrancar solo, con todo el flujo profesional.",
      destacado: false,
    },
    {
      id: "profesional",
      nombre: "Profesional",
      precio: 399,
      tecnicos: "3 técnicos + administrador",
      resumen: "El equipo en campo coordinado desde un solo lugar.",
      destacado: true,
    },
    {
      id: "empresa",
      nombre: "Empresa",
      precio: 1099,
      tecnicos: "10 técnicos + administrador",
      resumen: "Operación completa para empresas con varias cuadrillas.",
      destacado: false,
    },
  ],

  // Lo que incluyen todos los planes (aparece en cada tarjeta)
  incluyen: [
    "Servicios y constancias ilimitados",
    "Reporte de 6 pasos con fotos y firma",
    "PDF con tu logo y tus colores",
    "Captura sin internet que se sincroniza sola",
    "Portal para tus clientes",
    "Inventario de insumos por técnico",
  ],
  tecnicoExtra: 129,                   // pon null para ocultar la línea
};

export const wa = (texto) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto || CONFIG.mensajeBase)}`;

export const money = (n) => "$" + n.toLocaleString("es-MX");
