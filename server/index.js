import express from 'express';
const app = express();
app.all('/api/health', (req, res) => res.json({ status: 'ok', msg: 'Minimal boot successful!' }));
app.all('/api/(.*)', (req, res) => res.json({ status: 'ok', msg: 'Minimal route catch-all' }));
export default app;
