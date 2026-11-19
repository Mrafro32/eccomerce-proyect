const redis = require('../config/redisClient');

//operaciones crud sobre el carrito usando hashes

//crear o actualizar un producto dentro del carrito del usuario
exports.addItemToCart = async (req, res) => {
  try {
    //extraer el identificador del usuario desde los parametros de la url
    const { userId } = req.params;
    //extraer el nombre del producto y la cantidad desde el cuerpo de la peticion
    const { productName, quantity } = req.body;
    //definir la clave unica del carrito siguiendo la convencion de nombres
    const cartKey = `cart:${userId}`;

    //guardar o actualizar el campo del producto y su cantidad en el hash
    await redis.hset(cartKey, productName, quantity);
    
    //asignar o renovar el tiempo de expiracion del carrito a 24 horas en segundos
    await redis.expire(cartKey, 86400);

    //aumentar en 1 el puntaje del producto en el ranking de popularidad
    await redis.zincrby('ranking:productos', 1, productName);

    //responder con estado exitoso y los datos registrados
    res.status(200).json({
      message: 'Producto agregado/actualizado en el carrito',
      cartKey,
      item: { productName, quantity }
    });
  } catch (error) {
    //capturar y devolver cualquier error del servidor
    res.status(500).json({ error: error.message });
  }
};

//leer todos los productos almacenados en el carrito de un usuario
exports.getCart = async (req, res) => {
  try {
    //obtener el id del usuario desde la ruta
    const { userId } = req.params;
    //construir la clave correspondiente al carrito del usuario
    const cartKey = `cart:${userId}`;

    //recuperar todos los campos y valores del hash en una sola operacion
    const cartItems = await redis.hgetall(cartKey);
    //consultar los segundos restantes antes de que expire la clave del carrito
    const ttl = await redis.ttl(cartKey);

    //verificar si el objeto devuelto esta vacio porque no existe o ya expiro
    if (Object.keys(cartItems).length === 0) {
      return res.status(404).json({ message: 'El carrito esta vacio o ha expirado' });
    }

    //devolver el contenido del carrito junto con su tiempo de vida restante
    res.status(200).json({
      userId,
      expiresInSeconds: ttl,
      items: cartItems
    });
  } catch (error) {
    //manejar errores de ejecucion
    res.status(500).json({ error: error.message });
  }
};

//eliminar un producto especifico del carrito del usuario
exports.removeItemFromCart = async (req, res) => {
  try {
    //extraer el id de usuario y el nombre del producto desde la url
    const { userId, productName } = req.params;
    //construir la clave del hash del carrito
    const cartKey = `cart:${userId}`;

    //eliminar unicamente el campo del producto indicado dentro del hash
    const deleted = await redis.hdel(cartKey, productName);
    //validar si el producto realmente existia dentro del carrito
    if (!deleted) {
      return res.status(404).json({ message: 'El producto no estaba en el carrito' });
    }

    //confirmar la eliminacion del articulo
    res.status(200).json({ message: `Producto '${productName}' eliminado del carrito` });
  } catch (error) {
    //capturar fallos inesperados
    res.status(500).json({ error: error.message });
  }
};

//eliminar por completo todo el carrito de un usuario
exports.clearCart = async (req, res) => {
  try {
    //obtener el id del usuario desde los parametros
    const { userId } = req.params;
    //borrar la clave completa del carrito en redis
    await redis.del(`cart:${userId}`);
    //responder confirmando que el carrito fue vaciado
    res.status(200).json({ message: 'Carrito eliminado por completo' });
  } catch (error) {
    //devolver error en caso de fallo
    res.status(500).json({ error: error.message });
  }
};

//consultas especializadas con ttl y conjuntos ordenados

//crear una sesion temporal de usuario con autodestruccion por tiempo
exports.createSession = async (req, res) => {
  try {
    //extraer el token el id de usuario y los segundos de vida desde la peticion
    const { token, userId, ttlSeconds } = req.body;
    //definir la clave de la sesion con su prefijo correspondiente
    const sessionKey = `session:${token}`;

    //guardar el objeto de sesion como texto y asignar su expiracion de forma atomica
    await redis.setex(sessionKey, ttlSeconds || 60, JSON.stringify({ userId, active: true }));

    //responder con codigo 201 indicando que el recurso fue creado
    res.status(201).json({
      message: 'Sesion temporal creada',
      sessionKey,
      ttlSeconds: ttlSeconds || 60
    });
  } catch (error) {
    //manejar errores del servidor
    res.status(500).json({ error: error.message });
  }
};

//consultar si una sesion sigue activa y cuanto tiempo de vida le queda
exports.checkSession = async (req, res) => {
  try {
    //obtener el token de sesion desde los parametros de la url
    const { token } = req.params;
    //construir la clave completa de la sesion
    const sessionKey = `session:${token}`;

    //buscar el valor asociado a la clave de sesion
    const data = await redis.get(sessionKey);
    //obtener los segundos restantes de vida de la clave en redis
    const remainingTime = await redis.ttl(sessionKey);

    //si no hay datos significa que la sesion nunca existio o ya caduco
    if (!data) {
      return res.status(401).json({ message: 'Sesion expirada o inexistente' });
    }

    //convertir el texto json a objeto y devolverlo con el tiempo restante
    res.status(200).json({
      session: JSON.parse(data),
      remainingSeconds: remainingTime
    });
  } catch (error) {
    //capturar errores de ejecucion
    res.status(500).json({ error: error.message });
  }
};

//obtener los productos mas populares ordenados de mayor a menor
exports.getTopProducts = async (req, res) => {
  try {
    //consultar los primeros 5 elementos del conjunto ordenado con sus puntajes
    const top = await redis.zrevrange('ranking:productos', 0, 4, 'WITHSCORES');
    
    //crear un arreglo para estructurar los resultados de forma legible
    const formatted = [];
    //recorrer el arreglo plano de dos en dos para emparejar producto y puntaje
    for (let i = 0; i < top.length; i += 2) {
      formatted.push({ product: top[i], interactions: parseInt(top[i + 1], 10) });
    }

    //enviar la lista ordenada de productos populares
    res.status(200).json({ ranking: formatted });
  } catch (error) {
    //manejar errores del servidor
    res.status(500).json({ error: error.message });
  }
};