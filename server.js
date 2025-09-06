// --------------------------- CORS ROBUSTO ---------------------------
const envList = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowList = new Set([
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
  ...envList
]);

const allowRegex = [
  /\.biostrucx\.com$/,   // subdominios futuros
  /\.onrender\.com$/     // llamadas internas desde Render (si las necesitaras)
];

// Vary para caches
app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // health/ping/curl
    const ok = allowList.has(origin) || allowRegex.some(r => r.test(origin));
    return cb(ok ? null : new Error(`CORS: ${origin} no permitido`), ok);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ✅ en vez de '*' usa regex que matchea todo
app.options(/.*/, cors(corsOptions));
// -------------------------------------------------------------------

