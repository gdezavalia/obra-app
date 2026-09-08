# Dominio: gestión y seguimiento económico de obra — v2

**Fecha:** 08/09/2026 · **Reemplaza a:** `Dominio_Gestion_Obra_v1.md` (05/09/2026)
**Documento hermano:** `prd.md`

## Cómo se relaciona con el PRD

| | |
|---|---|
| **El PRD dice** | qué se construye: entidades, requisitos, fases, criterios de aceptación. |
| **Este documento dice** | por qué las reglas son así: de dónde salió cada una, qué error real la originó y qué pasa si alguien la "simplifica". |

**En caso de contradicción, manda el PRD.** Este documento no define entidades ni alcance: aporta el razonamiento detrás. Si al leerlo aparece una regla que el PRD no tiene, es un bug de este documento, no una regla nueva.

**Qué cambió respecto de v1:** la v1 se escribió antes de la entrevista con el estudio de arquitectura y describía un modelo de rubros planos donde solo la mano de obra tenía presupuesto. Ese modelo resultó ser el caso particular de una arquitecta, no el general. Toda la sección 5 de la v1 quedó obsoleta y está reescrita acá.

---

## 1. Contexto

| | |
|---|---|
| **Quién carga** | La arquitecta o su asistente. Perfil no técnico. |
| **Quién consume** | El cliente final. Recibe un reporte, no entra al sistema. |
| **Usuarios objetivo** | Corina + 3 arquitectos conocidos. 4 tenants, no un mercado. |
| **Cadencia** | Semanal. Liquidación y reporte los viernes. |
| **Objetivo** | Práctica de construcción end-to-end + herramienta real para 4 personas. No comercial. |

**Criterio de éxito:** una arquitecta carga una semana completa y genera el reporte sin preguntarle nada a Gero, tres semanas seguidas.

**Antipatrón a evitar:** el fracaso de 2021 y el riesgo abierto de Decora son el mismo — un sistema que depende de una persona para sostenerse. Con usuarios que son mujer y amigos, el feedback va a ser blando por cortesía. **Hay que medir uso, no opinión.** La única métrica que no miente: ¿siguen manteniendo el Excel en paralelo?

---

## 2. Las dos fuentes del modelo

### Fuente A — Obra "Remodelación casa San Lorenzo" (jun–sep 2026)
~120 gastos, 10 adicionales, 9 rubros, 14 semanas operadas a mano. Arquitecta independiente, obra chica, cliente particular.
Aportó: las categorías de gasto, el ciclo de estados de los adicionales, el respaldo documental por gasto, la doble moneda, la estructura del reporte y **las 11 validaciones**, que son el activo más difícil de reproducir.

### Fuente B — Estudio de arquitectura grande (entrevista 08/09/2026)
EDT de 3 niveles, ~200 paquetes de trabajo, codificación decimal `01.04.02`, obras largas.
Aportó: la estructura jerárquica, el reajuste por índice, los documentos a nivel de paquete, el alcance ampliado del proyecto (trámites y cierre administrativo, no solo obra física) y la confirmación de que la mecánica de fondo —imputar gastos contra una estructura presupuestaria para ver desvíos— no es una idiosincrasia.

**El descubrimiento clave:** los 9 rubros de Corina mapean casi uno a uno contra el nivel 2/3 de la EDT del estudio. **Su modelo es esta misma EDT achatada a un nivel.** Por eso la jerarquía configurable no es una concesión al caso grande: es la generalización correcta.

---

## 3. Por qué cada regla es como es

**Los materiales pueden o no tener presupuesto.**
Corina no los presupuesta: avisa qué hay que comprar, consigue cotizaciones y el cliente decide. El estudio sí los presupuesta, como paquetes propios dentro de cada etapa (`01.01.05 Materiales mantenimiento de obra`, `01.08.06 Materiales`). Por eso el presupuesto es opcional a nivel paquete y no una regla global. *La v1 decía que los materiales nunca se presupuestan; era falso fuera del caso de Corina.*

**El `tipo` del paquete existe para no imponer una estructura.**
Los materiales pueden vivir en el primer nivel o dentro de cada etapa según cómo trabaje cada estudio. El campo `tipo` permite que el reporte agrupe por tipo o por etapa sin que nadie tenga que adoptar la organización del otro.

**`revision_presupuesto` unifica adicionales y redeterminaciones.**
Parecían dos cosas distintas y son la misma: el presupuesto de un paquete cambió, por un motivo, en una fecha, con un documento detrás. Un adicional es un cambio de alcance; una redeterminación es un ajuste por índice. Mismo mecanismo, mismo ciclo de estados, mismo historial auditable.

**El reajuste es explícito, nunca automático.**
Un presupuesto que cambia solo entre un reporte y el siguiente es indefendible ante un cliente. La arquitecta dispara la redeterminación, el sistema propone los montos según el índice y ella aprueba. Queda un acta.

**Honorarios: solo "cobrado a la fecha".**
Nunca devengado ni saldo a cobrar. No es una simplificación técnica: es una decisión deliberada de Corina. El devengado varía con cada extra y genera discusiones con el cliente que no aportan nada.

**Cada gasto congela su cotización USD.**
El histórico en dólares nunca se recalcula. Un gasto de junio vale los dólares de junio, no los de hoy.

**Un gasto, un paquete.**
Sin prorrateo en v1. La compra que sirve a tres paquetes se carga como tres gastos. Se evaluó el prorrateo y se descartó: complica roll-up, validaciones y reporte, y todavía no hay evidencia de que haga falta.

**El sistema flagea, nunca corrige.**
Ningún monto se infiere, se autocompleta ni se ajusta solo. Esta regla no se negocia: la arquitecta firma los números frente a su cliente.

**El `pagado_por` no se muestra al cliente.**
Es información de liquidación entre arquitecta y cliente, no del avance de obra. Se guarda siempre, se muestra nunca.

---

## 4. Las 11 validaciones y el error que las originó

Este es el diferencial del producto. Ningún competidor las tiene porque no se deducen en una reunión de diseño: salieron de 14 semanas de operación real.

| # | Validación | Qué pasó de verdad |
|---|---|---|
| 1 | Monto fuera de orden de magnitud vs. la mediana del proveedor/paquete | Un revestimiento cargado en **$380** cuando eran **$380.000**. Pasó dos versiones de la planilla sin que nadie lo viera. |
| 2 | Honorarios liquidados sobre un período con gastos cargados después | El honorario del 04/09 fue el 15% de $5.399.414 sobre una semana que terminó cerrando en $6.359.414. Faltaron $144.000. |
| 3 | Categoría incoherente con el tipo del paquete | Honorarios cargados con categoría "Mano de obra". Inflaba el avance de un rubro inexistente. |
| 4 | Paquete que supera el 90% / 100% del presupuesto vigente | Electricidad llegó a **141,8%**: $3.000.000 sobre $2.116.000 aprobados. Se descubrió tarde. |
| 5 | Revisión en estado pendiente hace más de 7 días | Plata parada esperando una respuesta que nadie persigue. |
| 6 | Gasto de mano de obra sin proveedor | Rompe la trazabilidad del certificado. |
| 7 | Gasto sin respaldo cuando ese proveedor históricamente lo tenía | Aparece cuando alguien carga apurado. Se detecta comparando contra el patrón del propio proveedor. |
| 8 | Revisión de tipo adicional que incluye partida de materiales | El 2.º presupuesto de carpintería traía $200.000 de materiales dentro de un adicional. |
| 9 | Imputación a un paquete inexistente | Aparecieron etiquetas `Presupuesto 3a`, `9a`, `10` contra una tabla que solo tenía IDs 1–9. **Señal de producto: cuando el sistema no permite expresar algo, el usuario se inventa una taxonomía paralela.** |
| 10 | Gastos imputados a una revisión que superan su monto aprobado | El desvío silencioso más común. |
| 11 | Cambio de imputación de un gasto ya incluido en un reporte emitido | Impermeabilizantes que pasaron de Pintura a Albañilería entre dos versiones. Cambió números ya entregados al cliente. |

---

## 5. Qué resultó universal y qué era de Corina

La v1 planteaba esto como hipótesis. La entrevista con el estudio resolvió buena parte.

### 🟢 Confirmado universal
- Imputar cada gasto contra una estructura presupuestaria para medir desvío
- Separación entre trabajo y materiales
- Respaldo documental (el estudio lo lleva a nivel de paquete: pliego y planos)
- Estructura jerárquica de la obra
- Doble moneda / registro en USD
- Ciclo de aprobación de los cambios de alcance

### 🔴 Refutado — era específico de Corina
- *"Los materiales no se presupuestan"* → el estudio sí los presupuesta
- *"Los adicionales son solo de mano de obra"* → no se sostiene: el propio 2.º presupuesto de carpintería traía materiales
- *"Rubros planos"* → es una EDT achatada, no un modelo distinto

### 🟡 Sigue abierto — falta contrastar con los otros 3 arquitectos
- Honorarios como 15% sobre lo ejecutado, liquidados semanalmente
- La cadencia semanal de los viernes
- Que el cliente pueda pagar materiales directo al proveedor
- Ajuste alzado vs. obra por administración (si aparece administración, cambia el modelo económico entero)

### ✨ Aportado por el estudio, ausente en el modelo original
- Reajuste por índice de la construcción
- Documentos de especificación colgando del paquete
- Alcance que cubre el proyecto completo: higiene y seguridad, final de obra municipal, PH mensura y subdivisión, cierre administrativo
- Avance físico por paquete (identificado, postergado a P2)

---

## 6. El motor de reportes

El reporte no es una pantalla: es un documento imprimible que la arquitecta le entrega al cliente. La estructura está validada con un cliente real y con 14 iteraciones encima.

1. **Movimientos de la semana** — abre el reporte. KPIs + tabla detallada con respaldos.
2. **Estado general** — avance económico, inversión acumulada, desglose por categoría.
3. **Puntos de atención** — desvíos en tono neutro, orientados a decisión, no a culpa.
4. **Tabla maestra por paquete** — con roll-up por nivel.
5. **Gráficos** — barras por paquete y evolución acumulada semanal.
6. **Detalle por paquete** — revisiones con sus PDFs, certificados, materiales; la semana resaltada.
7. **Honorarios** — solo fecha y monto.

**Requisitos no obvios, todos aprendidos rompiendo algo:**
- Autocontenido, sin CDN. Los gráficos van como SVG inline. *(Un CDN caído deja al cliente mirando un reporte sin gráficos.)*
- Print CSS real: A4, cortes controlados, la semana completa en la página 1. *(El cliente imprime; si el corte cae mal, la tabla queda partida.)*
- Caracteres en español literales, nunca escapados. *(`Cartón` llegó a un reporte.)*
- Los links son URLs reales, no el texto visible de la celda. *(Leer con pandas devuelve "Factura" en vez del link; hay que usar openpyxl y tomar el hyperlink.)*

---

## 7. Trampas conocidas

🔴 **El sesgo inflacionario.** El reporte actual compara pesos de junio contra pesos de septiembre como si valieran lo mismo. Parte del "45% de avance" no es obra ejecutada: es licuación. Y parte de los desvíos que muestra como exceso son inflación, no alcance. Por eso el reajuste por índice no es una feature del estudio grande: es una corrección de un error que ya está en producción.

🔴 **La ingesta decide todo.** Si cargar un gasto no es más rápido que tipearlo en el Excel, la arquitecta vuelve al Excel y el sistema muere, por lindo que sea el dashboard. Es el mismo P0 que en Decora.

🟡 **Imputar contra 200 paquetes es mucho trabajo.** Elegir entre 9 rubros es trivial; buscar entre 200 paquetes, no. De ahí la sugerencia automática por proveedor y descripción: el 80% de los gastos van a los mismos 15 paquetes.

🟡 **Las taxonomías paralelas.** Cuando el usuario inventa códigos que el sistema no conoce (`Presupuesto 9a`), no es un error de carga: es el sistema que no le permite expresar algo real. Tratarlo como síntoma, no como dato sucio.

🟡 **Los adicionales mezclan materiales aunque la regla diga que no.** Pasó con carpintería. La regla teórica no sobrevive al contacto con el proveedor que cotiza todo junto.

---

## 8. Decisiones abiertas

- ¿Qué índice usan para el reajuste y de dónde sale la serie — carga manual, scraping, API?
- ¿La redeterminación se aplica a toda la obra o paquete por paquete?
- ¿Qué pasa con un paquete que se cierra sin consumir todo su presupuesto: el saldo se libera, se reasigna, queda como ahorro?
- ¿El cliente accede a una URL con el reporte vivo, o sigue recibiendo un PDF?
- ¿Se versionan los reportes emitidos, o se regeneran siempre desde los datos actuales?
- ¿Se soporta obra por administración, o el modelo asume ajuste alzado?

*(Resueltas desde la v1: el prorrateo de gastos —no—, la consolidación de rubros —el árbol la reemplaza—, y el tratamiento de materiales —presupuesto opcional por paquete—.)*
