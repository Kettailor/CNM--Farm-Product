const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const activityMiddleware = require('./middleware/activity.middleware');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(activityMiddleware);
app.use('/api', routes);

module.exports = app;
