const express = require('express');
require('dotenv').config();
const storeRoutes = require('./routes/storeRoutes');

const app = express();
app.use(express.json());
app.use(express.static('public'));

//rutas de la api
app.use('/api', storeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});