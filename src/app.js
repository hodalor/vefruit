const express = require('express');
const cors = require('cors');

const routes = require('./routes');

const app = express();
const allowedOrigins = Array.from(
  new Set(
    [
      'http://localhost:3000',
      'http://localhost:3001',
      ...String(process.env.FRONTEND_URL || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ]
  )
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server and same-origin requests without an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
// Hero and product image uploads are currently sent as base64 data URLs.
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'veFruit backend is running',
  });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
