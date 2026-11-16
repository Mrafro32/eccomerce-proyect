const redis = require('../src/config/redisClient');

async function seedDatabase() {
  try {
    console.log('Iniciando carga de datos iniciales');
    //se limpian los datos previos
    await redis.flushdb();

    //llenar el catalogo basico de productos
    const products = [
      { id: 'prod:101', name: 'Teclado Mecanico RGB', price: 85 },
      { id: 'prod:102', name: 'Mouse Inalambrico Pro', price: 45 },
      { id: 'prod:103', name: 'Monitor de 144Hz', price: 290 }
    ];

    for (const prod of products) {
      await redis.set(prod.id, JSON.stringify(prod));
    }
    //se iniciliza el ranking de productos populares 
    await redis.zadd('ranking:productos', 15, 'Teclado Mecanico RGB');
    await redis.zadd('ranking:productos', 32, 'Mouse Inalambrico Pro');
    await redis.zadd('ranking:productos', 8, 'Monitor de 144Hz');
    //crear un carrito inicial para el usuario 
    await redis.hset('cart:user1', {
      'Teclado Mecanico RGB': 1,
      'Mouse Inalambrico Pro': 2
    });
    //se crea una sesion temporal activa con expiracion
    await redis.setex('session:token_abc123', 3600, JSON.stringify({ userId: 'user1', role: 'customer' }));

    console.log('Base de datos llenada correctamente.');
  } catch (error) {
    console.error('Error en el seeding:', error);
  } finally {
    redis.disconnect();
  }
}

seedDatabase();