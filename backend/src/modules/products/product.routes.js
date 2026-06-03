import { Router } from 'express';
import * as ctrl from './product.controller.js';

export const productRouter = Router();

// Public catalog routes
productRouter.get('/categories',      ctrl.getCategories);
productRouter.get('/deals',           ctrl.getTopDeals);
productRouter.get('/essentials',      ctrl.getDailyEssentials);
productRouter.get('/labeled',         ctrl.getLabeledProducts);   // ?label=clearance|weeklySaver|bestSeller
productRouter.get('/banners',         ctrl.getActiveBanners);
productRouter.get('/sections',        ctrl.getVisibleSections);
productRouter.get('/delivery-config', ctrl.getPublicDeliveryConfig);
productRouter.get('/delivery-zone',   ctrl.getPublicDeliveryZone);
productRouter.get('/stores',          ctrl.getPublicStores);
productRouter.post('/validate-cart',  ctrl.validateCart);        // POST { storeId, items: [{productId, quantity}] }
productRouter.get('/:id/related',     ctrl.getRelatedProducts);
productRouter.get('/',                ctrl.getProducts);
productRouter.get('/:id',             ctrl.getProduct);
