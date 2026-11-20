import { useState, useEffect, useRef } from 'react';
import { FaCar, FaUser, FaCog, FaSignOutAlt, FaWhatsapp, FaFilePdf, FaCopy, FaRobot, FaMoneyBillWave, FaCreditCard, FaExchangeAlt, FaExclamationTriangle, FaUpload, FaDownload } from 'react-icons/fa';
import './App.css';

const f = (n) => "$ " + Math.round(n).toLocaleString("es-AR");
const u = (n) => "USD " + (Math.round(n * 100) / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 });
const cod = (n) => {
  n = Math.round(n);
  return "FC" + Math.floor(n / 1000000) + "AG" + String(Math.floor((n % 1000000) / 1000)).padStart(3, "0") + "HC" + String(n % 1000).padStart(3, "0");
};

function frances(mo, tna, n) {
  const i = tna / 1200;
  const pura = i ? (mo * i) / (1 - Math.pow(1 + i, -n)) : mo / n;
  let d = mo, sum = 0, first = 0, last = 0;
  for (let k = 1; k <= n; k++) {
    const it = d * i;
    let c = pura + it * 0.21;
    if (k === n) { c = d + d * i * 0.21; }
    if (k === 1) first = c;
    last = c;
    sum += c;
    d -= pura - it;
    if (d < 0) d = 0;
  }
  return { first, last, sum };
}

const ESTADO_INICIAL = {
  modeloIdx: 0, patenta: "con", tc: 1450, aplicarBonif: false, bonifMonto: 0,
  antPesos: 0, antUsd: 0, checkUsado: false, tasacion: 0, monedaUsado: "ars",
  financiar: false, lineaIdx: 0, plazo: 12, prioridad: "cuota",
  nombreCliente: "", telefonoCliente: "", iaInput: "", iaOutput: "", iaHistorial: []
};

export default function App() {
  const [logueado, setLogueado] = useState(false);
  const [vista, setVista] = useState("cotizador"); 
  const [pestanaActiva, setPestanaActiva] = useState(1); 
  const [verEnPesos, setVerEnPesos] = useState(false);
  
  const [modelos, setModelos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modeloIdx, setModeloIdx] = useState(ESTADO_INICIAL.modeloIdx);
  const [patenta, setPatenta] = useState(ESTADO_INICIAL.patenta);
  const [tc, setTc] = useState(ESTADO_INICIAL.tc);
  const [aplicarBonif, setAplicarBonif] = useState(ESTADO_INICIAL.aplicarBonif);
  const [bonifMonto, setBonifMonto] = useState(ESTADO_INICIAL.bonifMonto);
  const [antPesos, setAntPesos] = useState(ESTADO_INICIAL.antPesos);
  const [antUsd, setAntUsd] = useState(ESTADO_INICIAL.antUsd);
  const [checkUsado, setCheckUsado] = useState(ESTADO_INICIAL.checkUsado);
  const [tasacion, setTasacion] = useState(ESTADO_INICIAL.tasacion);
  const [monedaUsado, setMonedaUsado] = useState(ESTADO_INICIAL.monedaUsado);
  const [financiar, setFinanciar] = useState(ESTADO_INICIAL.financiar);
  const [lineaIdx, setLineaIdx] = useState(ESTADO_INICIAL.lineaIdx);
  const [plazo, setPlazo] = useState(ESTADO_INICIAL.plazo);
  const [prioridad, setPrioridad] = useState(ESTADO_INICIAL.prioridad);
  const [nombreCliente, setNombreCliente] = useState(ESTADO_INICIAL.nombreCliente);
  const [telefonoCliente, setTelefonoCliente] = useState(ESTADO_INICIAL.telefonoCliente);
  const [iaInput, setIaInput] = useState(ESTADO_INICIAL.iaInput);
  const [iaOutput, setIaOutput] = useState(ESTADO_INICIAL.iaOutput);
  const [iaHistorial, setIaHistorial] = useState(ESTADO_INICIAL.iaHistorial);

  const chatRef = useRef(null);
  const API_URL = "https://cotizador-byd.onrender.com";

  useEffect(() => {
    if (!logueado) return;
    const fetchData = async () => {
      try {
        const [resModelos, resLineas, resConfig] = await Promise.all([
          fetch(`${API_URL}/api/modelos`),
          fetch(`${API_URL}/api/lineas`),
          fetch(`${API_URL}/api/config`)
        ]);
        setModelos(await resModelos.json());
        
        // Como el backend ya devuelve las líneas agrupadas, las guardamos directo
        setLineas(await resLineas.json());
        
        const dataConfig = await resConfig.json();
        if (dataConfig.dolar_agencia) setTc(dataConfig.dolar_agencia);
      } catch (e) {
        console.error("Error cargando datos", e);
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, [logueado]);

  if (!logueado) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo"><FaCar size={40} color="#3B82F6" /></div>
          <h1>BYD Cotizador</h1>
          <p>Ingresá tus credenciales para acceder al sistema.</p>
          <input type="email" placeholder="Email (ej: vendedor@byd.com)" />
          <input type="password" placeholder="Contraseña" />
          <button onClick={() => setLogueado(true)}>Ingresar al Sistema</button>
          <span className="login-hint">* Cualquier mail/clave entra (Demo)</span>
        </div>
      </div>
    );
  }

  if (cargando) return <div className="loading-screen">Cargando base de datos...</div>;

  const dm = modelos[modeloIdx] || modelos[0];
  if (!dm) return <div className="loading-screen">Error: No hay modelos cargados en Supabase.</div>;

  const esUsd = dm.moneda === "USD";
  const nf = esUsd ? u : f;
  const bonifEfectiva = aplicarBonif ? (bonifMonto > 0 ? Math.min(bonifMonto, dm.precio) : dm.bonif) : 0;
  const total = (dm.precio - bonifEfectiva) + dm.fyf + (patenta === "con" ? dm.pat : 0);
  
  const anticipoEnMoneda = esUsd ? (antUsd + (tc > 0 ? antPesos / tc : 0)) : (antPesos + (antUsd * tc));
  const usadoEnMoneda = esUsd ? (monedaUsado === "usd" ? tasacion : (tc > 0 ? tasacion / tc : 0)) : (monedaUsado === "usd" ? tasacion * tc : tasacion);
  const dif = total - anticipoEnMoneda - (checkUsado ? usadoEnMoneda : 0);
  
  // --- FILTRADO FINAL ---
  // Como ya vienen agrupadas, solo filtramos las que aplican al modelo
  const lineasValidas = lineas.filter(l => {
    if (!l.aplica_a) return true;
    // Si "aplica_a" es una lista o un string, lo validamos
    const textoAplica = JSON.stringify(l.aplica_a).toLowerCase();
    if (textoAplica.includes("todos") || textoAplica === "[]" || textoAplica === '""') return true;
    
    const nombreBase = dm.nombre.split(' ').slice(0, 2).join(' ').toLowerCase();
    return textoAplica.includes(nombreBase);
  });

  const lineaIdxSeguro = Math.min(lineaIdx, Math.max(0, lineasValidas.length - 1));
  const lineaSel = lineasValidas[lineaIdxSeguro] || lineasValidas[0] || null;
  const plazosDisponibles = lineaSel?.plazos?.map(r => r[0]) || [];
  const plazoFinal = plazosDisponibles.includes(plazo) ? plazo : (plazosDisponibles[0] || 12);
  const plazoData = lineaSel?.plazos?.find(r => r[0] === plazoFinal) || lineaSel?.plazos?.[0] || null;

  let mejores = [];
  if (financiar && dif > 0) {
    const difArs = esUsd ? dif * tc : dif;
    lineasValidas.forEach((l, i) => {
      l.plazos?.forEach(r => {
        const tna = r[1];
        const quebranto = r[2] * 1.21;
        const gast = difArs * (quebranto / 100);
        const fr = frances(difArs, tna, r[0]);
        if (difArs <= (r[3] || Infinity)) {
          mejores.push({ l, i, r, cuota: fr.first, gast, pon: difArs + gast, costo: fr.sum - difArs + gast });
        }
      });
    });
    if (prioridad === "cuota") mejores.sort((a, b) => a.cuota - b.cuota);
    else if (prioridad === "inicial") mejores.sort((a, b) => a.pon - b.pon);
    else mejores.sort((a, b) => a.costo - b.costo);
  }

  let resumenFin = null;
  let errorFinanciacion = null;
  
  if (financiar && dif > 0 && plazoData) {
    const difArs = esUsd ? dif * tc : dif;
    const tope = plazoData[3] || Infinity;
    
    if (difArs > tope) {
      errorFinanciacion = `El monto a financiar (${f(difArs)}) supera el tope de la línea "${lineaSel?.nombre || ''}" para ${plazoFinal} meses. El tope máximo es de ${f(tope)}.`;
    } else {
      const quebranto = plazoData[2] * 1.21;
      const gasto = difArs * (quebranto / 100);
      const fr = frances(difArs, plazoData[1], plazoFinal);
      resumenFin = { linea: lineaSel?.nombre || '', plazo: plazoFinal, aFinanciar: difArs, gasto, cuota: fr.first, ultimaCuota: fr.last, totalCuotas: fr.sum, tope: plazoData[3] };
    }
  }

  const resetFormulario = () => {
    setModeloIdx(0); setPatenta("con"); setAplicarBonif(false); setBonifMonto(0);
    setAntPesos(0); setAntUsd(0); setCheckUsado(false); setTasacion(0); setMonedaUsado("ars");
    setFinanciar(false); setLineaIdx(0); setPlazo(12); setPrioridad("cuota");
    setNombreCliente(""); setTelefonoCliente(""); setIaInput(""); setIaOutput(""); setIaHistorial([]);
    setPestanaActiva(1);
    setVerEnPesos(false);
  };

  // ... (El resto del código JSX y funciones como handleIA, guardarDolar, etc. queda igual) ...

  // (Por brevedad, asumo que el resto del archivo es idéntico al que ya tenías, solo cambia la parte de arriba)
  
  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar no-print">
        <div className="sidebar-logo"><FaCar size={24} color="#3B82F6" /> <span>BYD</span></div>
        <nav className="sidebar-nav">
          <button className={vista === "cotizador" ? "active" : ""} onClick={() => setVista("cotizador")}><FaCar /> Cotizador</button>
          <button className={vista === "admin" ? "active" : ""} onClick={() => setVista("admin")}><FaCog /> Administración</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar"><FaUser /></div>
            <div><b>Vendedor Demo</b><span>vendedor@byd.com</span></div>
          </div>
          <button className="logout-btn" onClick={() => setLogueado(false)}><FaSignOutAlt /> Salir</button>
        </div>
      </aside>

      <main className="main-content">
        {vista === "admin" ? (
          // ... (código de admin) ...
          <div></div>
        ) : (
          // ... (código del cotizador) ...
          <div></div>
        )}
      </main>
    </div>
  );
}
