const clients = new Set();

function writeEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function addRealtimeClient(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  writeEvent(res, { event: 'connected', timestamp: new Date().toISOString() });
  clients.add(res);

  const heartbeat = setInterval(() => {
    writeEvent(res, { event: 'heartbeat', timestamp: new Date().toISOString() });
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
    res.end();
  });
}

function publishRealtimeEvent(event, payload = {}) {
  const message = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  for (const client of clients) {
    writeEvent(client, message);
  }
}

module.exports = {
  addRealtimeClient,
  publishRealtimeEvent,
};
