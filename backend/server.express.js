const app = require('./app.express');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`Construction API running on :${port}`);
});
