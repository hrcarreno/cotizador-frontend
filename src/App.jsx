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
  
  // --- AGRUPACIÓN Y FILTRADO EN EL FRONTEND ---
  const lineasAgrupadas = {};
  lineas.forEach(l => {
    const nombre = l.nombre;
    if (!lineasAgrupadas[nombre]) {
      lineasAgrupadas[nombre] = {
        nombre: nombre,
        tipo: l.tipo,
        uva: l.uva,
        aplica_a: l.aplica_a,
        plazos: []
      };
    }
    lineasAgrupadas[nombre].plazos.push([l.plazo, l.tna, l.quebranto, l.tope]);
  });
// ESTO ES UN DEBUG. LO VAMOS A BORRAR DESPUÉS.
console.log("LINEAS CRUDAS DE SUPABASE:", lineas);
console.log("MODELO SELECCIONADO:", dm.nombre);
  const lineasValidas = Object.values(lineasAgrupadas).filter(l => {
    if (!l.aplica_a) return true;
    const textoAplica = JSON.stringify(l.aplica_a).toLowerCase();
    if (textoAplica.includes("todos") || textoAplica === "[]" || textoAplica === '""') return true;
    const nombreBase = dm.nombre.split(' ').slice(0, 2).join(' ').toLowerCase();
    return textoAplica.includes(nombreBase);
  });

  const lineaIdxSeguro = Math.min(lineaIdx, Math.max(0, lineasValidas.length - 1));
  const lineaSel = lineasValidas[lineaIdxSeguro] || lineasValidas[0];
  const plazosDisponibles = lineaSel ? lineaSel.plazos.map(r => r[0]) : [];
  const plazoFinal = plazosDisponibles.includes(plazo) ? plazo : plazosDisponibles[0];
  const plazoData = lineaSel ? (lineaSel.plazos.find(r => r[0] === plazoFinal) || lineaSel.plazos[0]) : null;

  let mejores = [];
  if (financiar && dif > 0) {
    const difArs = esUsd ? dif * tc : dif;
    lineasValidas.forEach((l, i) => {
      l.plazos.forEach(r => {
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
      errorFinanciacion = `El monto a financiar (${f(difArs)}) supera el tope de la línea "${lineaSel.nombre}" para ${plazoFinal} meses. El tope máximo es de ${f(tope)}.`;
    } else {
      const quebranto = plazoData[2] * 1.21;
      const gasto = difArs * (quebranto / 100);
      const fr = frances(difArs, plazoData[1], plazoFinal);
      resumenFin = { linea: lineaSel.nombre, plazo: plazoFinal, aFinanciar: difArs, gasto, cuota: fr.first, ultimaCuota: fr.last, totalCuotas: fr.sum, tope: plazoData[3] };
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

  const handleIA = async () => {
    if (!iaInput.trim()) return;
    const promptActual = iaInput;
    setIaOutput("Conectando...");
    setIaHistorial(prev => [...prev, { role: "user", content: promptActual }]);
    setIaInput("");

    try {
      const res = await fetch(`${API_URL}/api/ia`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptActual, historial: iaHistorial })
      });
      const data = await res.json();
      if (data.error) { setIaOutput("Error: " + data.error); return; }

      if (data.pregunta) {
        setIaOutput(data.pregunta);
        setIaHistorial(prev => [...prev, { role: "assistant", content: data.pregunta }]);
        return;
      }

      const datos = JSON.parse(data.respuesta);
      if (datos.modelo) {
        const busq = datos.modelo.toLowerCase();
        const idx = modelos.findIndex(m => {
          const nom = m.nombre.toLowerCase();
          if (busq.includes("dolphin") && nom.includes("dolphin")) return busq.includes("gl") ? nom.includes("gl") : nom.includes("gs");
          if (busq.includes("song") && nom.includes("song")) return busq.includes("gl") ? nom.includes("gl") : nom.includes("gs");
          if (busq.includes("yuan") && nom.includes("yuan")) return busq.includes("gl") ? nom.includes("gl") : nom.includes("gs");
          return busq.includes("atto") ? nom.includes("atto") : busq.includes("seal") ? nom.includes("seal") : busq.includes("shark") ? nom.includes("shark") : busq.includes("ti7") ? nom.includes("ti7") : false;
        });
        if (idx >= 0) {
          setModeloIdx(idx);
          if (datos.aplicar_bonif && modelos[idx].bonif > 0) { setAplicarBonif(true); setBonifMonto(modelos[idx].bonif); }
        }
      }
      if (datos.anticipo_pesos !== undefined) setAntPesos(Number(datos.anticipo_pesos));
      if (datos.anticipo_usd !== undefined) setAntUsd(Number(datos.anticipo_usd));
      if (datos.usado) { setCheckUsado(true); setTasacion(Number(datos.usado)); }
      if (datos.financiar !== undefined) setFinanciar(Boolean(datos.financiar));

      setIaOutput("¡Datos cargados exitosamente!");
      setIaHistorial(prev => [...prev, { role: "assistant", content: "¡Datos cargados exitosamente!" }]);
    } catch (e) { setIaOutput("Fallo: " + e.message); }
  };

  const guardarDolar = async () => {
    await fetch(`${API_URL}/api/admin/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "dolar_agencia", valor: tc }) });
    alert("Dólar guardado");
  };

  const generarTextoResumen = () => {
    let texto = `*Cotización BYD - ${dm.nombre}*\n`;
    if (nombreCliente) texto += `Cliente: ${nombreCliente}\n`;
    texto += `\n`;
    texto += `Precio Auto: ${nf(dm.precio)}\n`;
    if (bonifEfectiva > 0) texto += `Bonificación: -${nf(bonifEfectiva)}\n`;
    texto += `FyF + Patent.: ${nf(dm.fyf + (patenta === "con" ? dm.pat : 0))}\n`;
    texto += `*Total: ${nf(total)}*\n\n`;
    texto += `Anticipo: ${nf(anticipoEnMoneda)}\n`;
    if (checkUsado) texto += `Usado: ${nf(usadoEnMoneda)}\n`;
    if (financiar && resumenFin) {
      texto += `Financiación: ${resumenFin.linea} (${resumenFin.plazo} meses)\n`;
      texto += `Cuota inicial: ${f(resumenFin.cuota)}\n`;
    }
    texto += `\n*Diferencia a abonar: ${nf(dif)}*`;
    return texto;
  };

  const copiarMensaje = () => {
    navigator.clipboard.writeText(generarTextoResumen());
    alert("¡Texto copiado al portapapeles!");
  };

  const enviarWhatsApp = () => {
    const texto = encodeURIComponent(generarTextoResumen());
    const tel = telefonoCliente.replace(/\D/g, "");
    const url = tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, "_blank");
  };

  const descargarPDF = () => {
    window.print();
  };

  const guardarEnCRM = async () => {
    if (!nombreCliente.trim() || !telefonoCliente.trim()) {
      alert("Por favor, ingresá el nombre y teléfono del cliente antes de guardar.");
      return;
    }

    try {
      const payload = {
        cliente_nombre: nombreCliente,
        cliente_telefono: telefonoCliente,
        modelo: dm.nombre,
        moneda: dm.moneda,
        total: total,
        anticipo: anticipoEnMoneda,
        diferencia: dif,
        financiado: financiar,
        linea_financiacion: financiar ? resumenFin?.linea : null,
        plazo: financiar ? resumenFin?.plazo : null,
        cuota_inicial: financiar ? resumenFin?.cuota : null
      };

      const res = await fetch(`${API_URL}/api/cotizaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("✅ Cotización guardada exitosamente en el CRM");
      } else {
        alert("❌ Hubo un error al guardar en el CRM");
      }
    } catch (error) {
      alert("❌ Error de conexión al guardar");
    }
  };

  const renderEquiv = (montoEnMonedaAuto) => {
    if (!montoEnMonedaAuto) return null;
    if (esUsd) return <div className="row mut" style={{ fontSize: '11px', paddingTop: 0, color: 'var(--mut)' }}><span></span><span>≈ {f(montoEnMonedaAuto * tc)}</span></div>;
    return <div className="row mut" style={{ fontSize: '11px', paddingTop: 0, color: 'var(--mut)' }}><span></span><span>≈ {u(tc > 0 ? montoEnMonedaAuto / tc : 0)}</span></div>;
  };

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
          <div className="admin-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1>Configuración del Sistema</h1>
                <p className="sub">Actualizá los precios y tasas de forma masiva usando Excel.</p>
              </div>
            </div>
            
            <div className="card" style={{ borderTop: '3px solid #3B82F6', marginTop: '20px' }}>
              <h2>Cotización del Dólar</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: '400px' }}>
                <div style={{ flex: 1 }}>
                  <label>Valor Dólar Agencia</label>
                  <input type="number" value={tc} onChange={(e) => setTc(Number(e.target.value))} />
                </div>
                <button onClick={guardarDolar}>Guardar Dólar</button>
              </div>
            </div>

            <div className="card" style={{ marginTop: '30px', textAlign: 'center', padding: '40px 20px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Gestión de Vehículos y Financiación</h2>
              <p style={{ color: 'var(--mut)', marginBottom: '30px', maxWidth: '600px', margin: '0 auto 30px' }}>
                Descargá el archivo CSV, editalo con Excel o Google Sheets, y volvé a subirlo. 
                <b> El sistema reemplazará toda la información anterior con la del archivo.</b>
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <a 
                  href={`${API_URL}/api/admin/exportar`} 
                  download 
                  className="btn-outline" 
                  style={{ textDecoration: 'none', padding: '14px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <FaDownload /> Exportar CSV
                </a>
                <label className="btn-next" style={{ cursor: 'pointer', margin: 0, padding: '14px 30px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px' }}>
                  <FaUpload /> Importar CSV
                  <input 
                    type="file" 
                    accept=".csv" 
                    style={{ display: 'none' }} 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      
                      if (window.confirm("⚠️ ¿Estás seguro? Esto BORRARÁ todos los modelos y líneas actuales y cargará los del archivo.")) {
                        try {
                          setCargando(true);
                          const res = await fetch(`${API_URL}/api/admin/importar`, {
                            method: "POST",
                            body: formData
                          });
                          const data = await res.json();
                          if (data.error) {
                            alert("Error: " + data.error);
                            setCargando(false);
                          } else {
                            alert("✅ Datos importados con éxito. La página se va a recargar.");
                            window.location.reload();
                          }
                        } catch (err) {
                          alert("Fallo al importar el archivo");
                          setCargando(false);
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="cotizador-layout">
            
            <header className="top-header no-print">
              <div>
                <h1>Cotizador BYD</h1>
                <p className="sub">Cliente: <b>{nombreCliente || "Sin nombre"}</b> | Modelo: <b>{dm.nombre}</b></p>
              </div>
              <button className="btn-reset" onClick={resetFormulario}>Nueva Consulta</button>
            </header>

            <div className="ia-card no-print">
              <div className="ia-header"><FaRobot size={18} color="#3B82F6"/> <b>Asistente IA</b> <span className="ia-hint">(Escribí "Quiere un Atto 2 con 10 palos")</span></div>
              <div className="ia-chat">
                {iaHistorial.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>{m.content}</div>
                ))}
              </div>
              <div className="ia-input-row">
                <input type="text" value={iaInput} onChange={(e) => setIaInput(e.target.value)} placeholder="Describí la operación..." onKeyDown={(e) => e.key === 'Enter' && handleIA()} />
                <button onClick={handleIA}>Procesar</button>
              </div>
            </div>

            <div className="grid-columns">
              <div className="col-form">
                <div className="tabs-header no-print">
                  <button className={pestanaActiva === 1 ? "active" : ""} onClick={() => setPestanaActiva(1)}><FaCar /> 1. Vehículo</button>
                  <button className={pestanaActiva === 2 ? "active" : ""} onClick={() => setPestanaActiva(2)}><FaMoneyBillWave /> 2. Pago</button>
                  <button className={pestanaActiva === 3 ? "active" : ""} onClick={() => setPestanaActiva(3)}><FaCreditCard /> 3. Financiación</button>
                </div>

                <div className="tab-content">
                  {pestanaActiva === 1 && (
                    <div className="card">
                      <h2>Configuración del Vehículo</h2>
                      <label>Modelo</label>
                      <select value={modeloIdx} onChange={(e) => setModeloIdx(Number(e.target.value))}>
                        {modelos.map((m, i) => <option key={i} value={i}>{m.nombre}</option>)}
                      </select>

                      {dm.bonif > 0 && (
                        <div style={{ marginTop: '15px' }}>
                          <label className="switch">
                            <input type="checkbox" checked={aplicarBonif} onChange={(e) => setAplicarBonif(e.target.checked)} />
                            <span>Aplicar bonificación</span>
                          </label>
                          {aplicarBonif && (
                            <div className="two">
                              <div>
                                <label>Monto Bonif.</label>
                                <input type="text" value={bonifMonto === 0 ? "" : bonifMonto} onChange={(e) => setBonifMonto(Number(e.target.value.replace(/\D/g, "")) || 0)} />
                              </div>
                              <div>
                                <label>Código</label>
                                <div className="codigo-disfrazado">{cod(dm.bonif)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <label>Patentamiento</label>
                      <select value={patenta} onChange={(e) => setPatenta(e.target.value)}>
                        <option value="con">A cargo del Concesionario</option>
                        <option value="cli">A cargo del Cliente</option>
                      </select>

                      <button className="btn-next" onClick={() => setPestanaActiva(2)}>Siguiente: Pago →</button>
                    </div>
                  )}

                  {pestanaActiva === 2 && (
                    <div className="card">
                      <h2>Forma de Pago</h2>
                      <label>Anticipo en Pesos ($)</label>
                      <input type="number" value={antPesos} onChange={(e) => setAntPesos(Number(e.target.value))} placeholder="Ej: 10000000" />
                      
                      <label>Anticipo en Dólares (USD)</label>
                      <input type="number" value={antUsd} onChange={(e) => setAntUsd(Number(e.target.value))} placeholder="Ej: 20000" />

                      <label className="switch" style={{marginTop: '20px'}}>
                        <input type="checkbox" checked={checkUsado} onChange={(e) => setCheckUsado(e.target.checked)} />
                        <span>Entrega usado en parte de pago</span>
                      </label>
                      {checkUsado && (
                        <div className="two" style={{ marginTop: '10px' }}>
                          <div><label>Tasación</label><input type="number" value={tasacion} onChange={(e) => setTasacion(Number(e.target.value))} /></div>
                          <div><label>Moneda</label><select value={monedaUsado} onChange={(e) => setMonedaUsado(e.target.value)}><option value="ars">Pesos</option><option value="usd">Dólares</option></select></div>
                        </div>
                      )}

                      <label style={{marginTop: '20px'}}>Datos del Cliente</label>
                      <div className="two">
                        <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Nombre completo" />
                        <input type="text" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} placeholder="Teléfono" />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button className="btn-outline" style={{ flex: 1 }} onClick={() => setPestanaActiva(1)}>← Volver</button>
                        <button className="btn-next" style={{ flex: 2 }} onClick={() => setPestanaActiva(3)}>Siguiente: Financiación →</button>
                      </div>
                    </div>
                  )}

                  {pestanaActiva === 3 && (
                    <div className="card">
                      <h2>Financiación</h2>
                      <label className="switch">
                        <input type="checkbox" checked={financiar} onChange={(e) => setFinanciar(e.target.checked)} />
                        <span>Financiar saldo restante</span>
                      </label>

                      {financiar ? (
                        <>
                          <label>Línea Santander</label>
                          <select value={lineaIdxSeguro} onChange={(e) => setLineaIdx(Number(e.target.value))}>
                            {lineasValidas.map((l, i) => <option key={i} value={i}>{l.nombre}</option>)}
                          </select>

                          <label>Plazo</label>
                          <div className="chips">
                            {lineaSel.plazos.map(r => (
                              <button key={r[0]} className={plazoFinal === r[0] ? "chip active" : "chip"} onClick={() => setPlazo(r[0])}>{r[0]} meses</button>
                            ))}
                          </div>

                          {dif > 0 && (
                            <>
                              <label>Qué prioriza el cliente</label>
                              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                                <option value="cuota">Cuota más baja</option>
                                <option value="inicial">Poner menos al inicio</option>
                                <option value="costo">Menor costo total</option>
                              </select>

                              {errorFinanciacion ? (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', color: '#EF4444', padding: '16px', borderRadius: '8px', marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                  <FaExclamationTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                                  <div>
                                    <b>Atención:</b> {errorFinanciacion}
                                  </div>
                                </div>
                              ) : resumenFin ? (
                                <div className="detalle-financiacion">
                                  <h3>Resumen de la opción</h3>
                                  <div className="row"><span>Cuota Inicial:</span> <span className="cuota-detalle">{f(resumenFin.cuota)}</span></div>
                                  <div className="row mut"><span>Última Cuota:</span> <span>{f(resumenFin.ultimaCuota)}</span></div>
                                  <div className="row mut"><span>Gasto Otorg.:</span> <span>{f(resumenFin.gasto)}</span></div>
                                </div>
                              ) : null}
                            </>
                          )}
                        </>
                      ) : (
                        <div className="empty-state">
                          <p>El cliente abonará la diferencia en efectivo o transferencia.</p>
                        </div>
                      )}

                      <button className="btn-outline" style={{ marginTop: '20px', width: '100%' }} onClick={() => setPestanaActiva(2)}>← Volver al Pago</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-summary">
                <div className="summary-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Resumen</h2>
                    <button className="no-print"
                      onClick={() => setVerEnPesos(!verEnPesos)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--acc)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: 0 }}
                    >
                      <FaExchangeAlt /> Ver en {verEnPesos ? 'USD' : 'ARS'}
                    </button>
                  </div>
                  
                  <div className="summary-details">
                    <div className="row">
                      <span>Precio Auto:</span> 
                      <span>{verEnPesos ? f(total * tc) : nf(dm.precio)}</span>
                    </div>
                    {verEnPesos && esUsd && renderEquiv(dm.precio)}
                    {!verEnPesos && !esUsd && renderEquiv(dm.precio)}

                    {bonifEfectiva > 0 && (
                      <>
                        <div className="row">
                          <span>Bonificación:</span> 
                          <span>-{verEnPesos ? f(bonifEfectiva * tc) : nf(bonifEfectiva)}</span>
                        </div>
                        {verEnPesos && esUsd && renderEquiv(-bonifEfectiva)}
                        {!verEnPesos && !esUsd && renderEquiv(-bonifEfectiva)}
                      </>
                    )}
                    
                    <div className="row">
                      <span>FyF + Patent.:</span> 
                      <span>{verEnPesos ? f((dm.fyf + (patenta === "con" ? dm.pat : 0)) * tc) : nf(dm.fyf + (patenta === "con" ? dm.pat : 0))}</span>
                    </div>
                    {verEnPesos && esUsd && renderEquiv(dm.fyf + (patenta === "con" ? dm.pat : 0))}
                    {!verEnPesos && !esUsd && renderEquiv(dm.fyf + (patenta === "con" ? dm.pat : 0))}

                    <div className="row total">
                      <span>Total:</span> 
                      <span>{verEnPesos ? f(total * tc) : nf(total)}</span>
                    </div>
                    {verEnPesos && esUsd && renderEquiv(total)}
                    {!verEnPesos && !esUsd && renderEquiv(total)}

                    <div className="divider"></div>
                    
                    <div className="row">
                      <span>Anticipo:</span> 
                      <span>{verEnPesos ? f(anticipoEnMoneda * tc) : nf(anticipoEnMoneda)}</span>
                    </div>
                    {verEnPesos && esUsd && renderEquiv(anticipoEnMoneda)}
                    {!verEnPesos && !esUsd && renderEquiv(anticipoEnMoneda)}

                    {checkUsado && (
                      <>
                        <div className="row">
                          <span>Usado:</span> 
                          <span>{verEnPesos ? f(usadoEnMoneda * tc) : nf(usadoEnMoneda)}</span>
                        </div>
                        {verEnPesos && esUsd && renderEquiv(usadoEnMoneda)}
                        {!verEnPesos && !esUsd && renderEquiv(usadoEnMoneda)}
                      </>
                    )}
                    {financiar && (
                      <>
                        <div className="row">
                          <span>A Financiar:</span> 
                          <span>{verEnPesos ? f(resumenFin?.aFinanciar || 0) : nf((resumenFin?.aFinanciar || 0) / tc)}</span>
                        </div>
                        {verEnPesos && esUsd && renderEquiv((resumenFin?.aFinanciar || 0) / tc)}
                        {!verEnPesos && !esUsd && renderEquiv(resumenFin?.aFinanciar || 0)}
                      </>
                    )}
                  </div>

                  <div className="summary-total-box">
                    <span>Diferencia a abonar</span>
                    <div className="cuota">
                      {verEnPesos ? f(dif * tc) : nf(dif)}
                    </div>
                    {!verEnPesos && esUsd && <div className="conv-hint">≈ {f(dif * tc)}</div>}
                    {!verEnPesos && !esUsd && <div className="conv-hint">≈ {u(tc > 0 ? dif / tc : 0)}</div>}
                    {verEnPesos && esUsd && <div className="conv-hint">≈ {u(tc > 0 ? dif : 0)}</div>}
                  </div>

                  <div className="summary-actions no-print">
                    <button className="btn-whatsapp" onClick={enviarWhatsApp}><FaWhatsapp /> Enviar por WhatsApp</button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-outline" style={{ flex: 1 }} onClick={copiarMensaje}><FaCopy /> Copiar</button>
                      <button className="btn-outline" style={{ flex: 1 }} onClick={descargarPDF}><FaFilePdf /> PDF</button>
                    </div>
                    <button className="btn-save" style={{ marginTop: '8px' }} onClick={guardarEnCRM}>Guardar Cotización</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
