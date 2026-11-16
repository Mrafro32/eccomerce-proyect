const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');

//rutas CRUD carrito
router.post('/cart/:userId', storeController.addItemToCart);
router.get('/cart/:userId', storeController.getCart);
router.delete('/cart/:userId/:productName', storeController.removeItemFromCart);
router.delete('/cart/:userId', storeController.clearCart);

//rutas especializadas
router.post('/session', storeController.createSession);
router.get('/session/:token', storeController.checkSession);
router.get('/ranking', storeController.getTopProducts);

module.exports = router;