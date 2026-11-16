const Redis = require('ioredis');
require('dotenv').config();
const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
  console.log('Conectado exitosamente a Redis cloud');
});

redis.on('error', (err) => {
  console.error('Error de conexion con redis:', err);
});

module.exports = redis;