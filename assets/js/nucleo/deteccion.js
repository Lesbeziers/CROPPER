/* ================================
   NÚCLEO — detección de pupilas (MediaPipe FaceLandmarker)

   Extraído de js/detector.js para que los dos modos compartan UNA sola copia
   del algoritmo. La cascada y el filtro de plausibilidad de abajo costaron
   caros de afinar: duplicarlos significaría arreglar dos veces cada fallo de
   detección, que es justo donde más daño han hecho históricamente.

   Este módulo no sabe nada de modos: ni toca el DOM, ni lee el estado, ni
   guarda nada. Sólo recibe una imagen y devuelve dos puntos, o null.
   El recorrido del lote —progreso, guardado, avisos— lo pone cada modo.
================================ */
/*
  CSP corporativa (sin tocar servidor):
  - Evitamos img-src blob: usando data: para las imágenes cargadas por el usuario.
  - Evitamos connect-src a Google auto-alojando MediaPipe bajo el mismo dominio (self).

  Los ficheros viven en js/vendor/mediapipe/. Las rutas se resuelven contra la URL de
  ESTE módulo (import.meta.url), no contra la del HTML: así el modelo y el wasm se
  encuentran aunque el HTML cambie de sitio o de nombre.

  El bundle se distribuye como .mjs y aquí se guarda como .js A PROPÓSITO. Un
  `import()` sólo acepta la respuesta si el servidor la envía con un tipo MIME de
  JavaScript, y no hay plan B: si no lo es, falla y no hay detección. Muchos
  servidores corporativos no tienen .mjs en su tabla de tipos —IIS, de hecho,
  devuelve 404 con las extensiones que no conoce—, y .js lo sirve absolutamente
  todo. La extensión no cambia nada para el navegador; lo que cuenta es el MIME.
  Así no hace falta tocar la configuración del servidor, que es justo lo que no
  podemos hacer.
*/
import { isCancelled } from '../cancel.js';
import { crearLienzo, lienzoTieneContenido, ErrorMemoriaLienzo } from '../utils.js';

const BUNDLE   = new URL('../vendor/mediapipe/vision_bundle.js',    import.meta.url).href;
const WASM_DIR = new URL('../vendor/mediapipe/wasm',                import.meta.url).href;
const MODEL    = new URL('../vendor/mediapipe/face_landmarker.task', import.meta.url).href;

const { FaceLandmarker, FilesetResolver } = await import(BUNDLE);

let faceLandmarker=null, faceReady=false;

export const isModelReady=()=>faceReady;

/* Cargar el modelo tarda, y cada modo lo anuncia en su propia interfaz.
   `alEmpezar` se llama sólo si de verdad hay que cargarlo; `alTerminar`,
   siempre que se haya llamado al primero. */
export async function ensureModelReady({ alEmpezar, alTerminar } = {}){
  if(faceReady) return;

  alEmpezar?.();
  try{
    const vision=await FilesetResolver.forVisionTasks(WASM_DIR);
    faceLandmarker=await FaceLandmarker.createFromOptions(vision,{
      baseOptions:{modelAssetPath:MODEL},
      runningMode:"IMAGE",
      numFaces:1,
      minFaceDetectionConfidence:0.2,
      minFacePresenceConfidence:0.2,
      minTrackingConfidence:0.2
    });
    faceReady=true;
  }finally{
    alTerminar?.();
  }
}

/* Centro de cada ojo = promedio de 6 landmarks */
const EYE_L=[33,133,159,145,246,161];
const EYE_R=[362,263,386,374,466,388];

/* Punto más bajo del mentón. Comprobado el 2026-09-29 proyectando los 478
   puntos de cinco caras reales: el 152 es el más bajo en cuatro de ellas, y en
   la quinta lo es el 377, contiguo y con el mismo valor.

   OJO: es la barbilla SEGÚN LA MALLA, que no tiene por qué coincidir con la
   barbilla que se ve en la foto — el tejido blando y la sombra de la mandíbula
   pueden caer por debajo. Por eso se devuelve para PINTARLA y compararla, no
   para tomar decisiones automáticas con ella. */
const BARBILLA = 152;

function tryDetect(img){
  const r=faceLandmarker.detect(img);
  return r?.faceLandmarks?.[0] || null;
}

function meanPoint(lm,ids){
  let sx=0, sy=0, n=0;
  ids.forEach(i=>{
    if(lm[i]){ sx+=lm[i].x; sy+=lm[i].y; n++; }
  });
  return n?{x:sx/n,y:sy/n}:null;
}

/* ================================
   Filtro de plausibilidad

   MediaPipe a veces "encuentra" una cara donde no la hay —en un pliegue de la
   ropa, en una raqueta, en una sombra— y devuelve sus 478 puntos igualmente,
   sin señal de error. Antes nos los creíamos: una foto llegó a medir 694 px
   entre pupilas con los puntos puestos a la altura de las rodillas, y el fallo
   viajó silenciosamente hasta el ZIP exportado.

   Estas comprobaciones descartan esos falsos positivos. Si ninguna variante da
   un resultado creíble, preferimos no devolver nada: la imagen queda marcada
   como FALTA y se colocan los puntos a mano, que es honesto. Un OK equivocado
   es peor que un hueco visible.

   OJO — lo que este filtro NO hace: descartar la cara EQUIVOCADA. Con
   numFaces:1 el modelo devuelve una sola cara y, si es la de un acompañante
   del fondo, pasará el filtro sin problema porque es una cara de verdad. En
   fotos de alfombra roja ese riesgo existe.
================================ */
const INCLINACION_MAXIMA = 30;   // grados respecto a la horizontal
const PROPORCION_MINIMA  = 0.12; // distancia entre ojos ÷ anchura de la cara
const PROPORCION_MAXIMA  = 0.85;

function anchuraCara(lm){
  let min=Infinity, max=-Infinity;
  for(const p of lm){ if(p.x<min) min=p.x; if(p.x>max) max=p.x; }
  return max-min;
}

/* Proporción entre la separación de los ojos y la anchura de la cara.
   No depende de la escala ni de la rotación, así que puede comprobarse sobre
   la variante sin deshacer nada. Todo en píxeles de esa misma imagen. */
function proporcionCreible(Lpx,Rpx,lm,anchoPx){
  const caraPx = anchuraCara(lm) * anchoPx;
  if(!(caraPx > 0)) return false;
  const p = Math.hypot(Rpx.x-Lpx.x, Rpx.y-Lpx.y) / caraPx;
  return p >= PROPORCION_MINIMA && p <= PROPORCION_MAXIMA;
}

/* Inclinación de la línea entre ojos. OJO: hay que medirla en las coordenadas
   de la imagen ORIGINAL — sobre una variante rotada a propósito daría un
   ángulo falso. En píxeles, nunca en coordenadas normalizadas: la X va con el
   ancho y la Y con el alto, y mezclarlas deformaría el ángulo. */
function inclinacionCreible(L,R){
  const dx = R.x - L.x;
  const dy = R.y - L.y;
  if(!(dx > 0)) return false;   // el ojo izquierdo va a la izquierda
  return Math.abs(Math.atan2(dy,dx) * 180 / Math.PI) <= INCLINACION_MAXIMA;
}

/* Deshace rotación, escalado y recorte de una variante para volver a
   coordenadas de la imagen original */
function mapBack(p,v){
  const s=v.sx;
  const a=v.angle*Math.PI/180;
  const x=p.x - v.w/2;
  const y=p.y - v.h/2;

  const xr = x*Math.cos(-a) - y*Math.sin(-a);
  const yr = x*Math.sin(-a) + y*Math.cos(-a);

  // /s deshace el escalado; +ox,+oy devuelven el desplazamiento del recorte
  return { x:(xr+v.w0/2)/s + v.ox, y:(yr+v.h0/2)/s + v.oy };
}

/* `region` acota qué trozo del original se mira, en fracciones de la altura.
   Recortar la franja de arriba multiplica los píxeles disponibles para la
   cara: en un cuerpo entero de 7545 px de alto reducido a 1600, la cabeza
   queda en unos 40 px y el modelo no la ve; mirando sólo el tercio superior,
   la misma cabeza pasa a más de 100 px. */
async function variantImage(srcImg,maxSide,angle,contrast=120,bright=110,region={desde:0,hasta:1}){
  const ox = 0;
  const oy = Math.round(srcImg.naturalHeight * region.desde);
  const sw = srcImg.naturalWidth;
  const sh = Math.round(srcImg.naturalHeight * (region.hasta - region.desde));

  const s=Math.min(1, maxSide/Math.max(sw,sh));
  const w0=sw*s, h0=sh*s;
  const rad=angle*Math.PI/180;
  const sin=Math.abs(Math.sin(rad)), cos=Math.abs(Math.cos(rad));
  const w=Math.round(w0*cos+h0*sin);
  const h=Math.round(h0*cos+w0*sin);

  const DONDE='preparar una variante para la detección';
  const {c,cx}=crearLienzo(w,h,DONDE);

  cx.filter=`contrast(${contrast}%) brightness(${bright}%)`;
  cx.translate(w/2,h/2);
  cx.rotate(rad);
  cx.drawImage(srcImg, ox,oy,sw,sh, -w0/2,-h0/2,w0,h0);

  // Un lienzo vacío aquí significa que el navegador no ha llegado a dibujar:
  // sin esta comprobación, al modelo le llegaría una imagen en blanco y la
  // detección fallaría en silencio.
  cx.setTransform(1,0,0,1,0,0);
  if(!lienzoTieneContenido(cx,w,h)) throw new ErrorMemoriaLienzo(DONDE);

  const out=new Image();
  await new Promise((res,rej)=>{
    out.onload=res;
    out.onerror=()=>rej(new ErrorMemoriaLienzo('decodificar una variante'));
    out.src=c.toDataURL('image/jpeg',0.92);   // los manejadores, antes del src
  });

  return {img:out, sx:s, angle, w, h, w0, h0, ox, oy};
}

/* Intento directo y, si falla, cascada de hasta 60 variantes
   (4 tamaños × 5 ángulos × 3 filtros) */
export async function detectEyesPoints(srcImg){
  if(!faceReady) return null;

  let lm = tryDetect(srcImg);
  if(lm){
    const L=meanPoint(lm,EYE_L);
    const R=meanPoint(lm,EYE_R);
    if(L && R){
      const Lpx={x:L.x*srcImg.naturalWidth, y:L.y*srcImg.naturalHeight};
      const Rpx={x:R.x*srcImg.naturalWidth, y:R.y*srcImg.naturalHeight};

      if(proporcionCreible(Lpx,Rpx,lm,srcImg.naturalWidth) && inclinacionCreible(Lpx,Rpx)){
        const B = lm[BARBILLA];
        return {
          left : Lpx,
          right: Rpx,
          barbilla: B ? {x:B.x*srcImg.naturalWidth, y:B.y*srcImg.naturalHeight} : null
        };
      }
      // Cara inventada: seguimos probando con la cascada en vez de creérnosla
      console.warn('Detección descartada por inverosímil (intento directo)');
    }
  }

  // De más probable a menos: primero la franja de arriba, donde está la cabeza
  // en cualquier retrato de pie, y sólo después la imagen entera.
  const regiones=[{desde:0,hasta:0.35},{desde:0,hasta:0.55},{desde:0,hasta:1}];
  const sizes=[1600,1200,1024,800];
  const angles=[-18,-9,0,9,18];
  const filters=[{c:120,b:110},{c:140,b:120},{c:110,b:105}];

  for(const reg of regiones)
  for(const s of sizes)
  for(const a of angles)
  for(const f of filters){

    if(isCancelled()) return null;

    const v=await variantImage(srcImg,s,a,f.c,f.b,reg);
    if(isCancelled()) return null;

    lm = tryDetect(v.img);
    if(!lm) continue;

    const L=meanPoint(lm,EYE_L);
    const R=meanPoint(lm,EYE_R);
    if(!L||!R) continue;

    const Lpx={x:L.x*v.img.naturalWidth,y:L.y*v.img.naturalHeight};
    const Rpx={x:R.x*v.img.naturalWidth,y:R.y*v.img.naturalHeight};

    // La proporción se mide sobre la variante; la inclinación, ya de vuelta
    // en la imagen original, porque aquí la variante está rotada a propósito.
    if(!proporcionCreible(Lpx,Rpx,lm,v.img.naturalWidth)) continue;

    const izq = mapBack(Lpx,v);
    const dch = mapBack(Rpx,v);
    if(!inclinacionCreible(izq,dch)) continue;

    // La barbilla también hay que devolverla a coordenadas del original
    const B = lm[BARBILLA];
    const barbilla = B
      ? mapBack({x:B.x*v.img.naturalWidth, y:B.y*v.img.naturalHeight}, v)
      : null;

    return { left:izq, right:dch, barbilla };
  }

  return null;
}
