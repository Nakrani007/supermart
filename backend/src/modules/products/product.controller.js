import * as productService from './product.service.js';
import { getActiveBannersService, getVisibleSectionsService, getDeliveryConfigService, getDeliveryZoneService, getActiveStoresService } from '../admin/admin.service.js';

export async function getProducts(req, res, next) {
  try {
    const { category, search, page = '1', limit = '40', sort, minPrice, maxPrice, exclude, storeId } = req.query;
    const result = await productService.getAllProductsService({
      categorySlug: category,
      search,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      sort,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      exclude,
      storeId: storeId || undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(req, res, next) {
  try {
    const categories = await productService.getCategoriesService();
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const { storeId } = req.query;
    const product = await productService.getProductByIdService(req.params.id, storeId || undefined);
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

export async function getTopDeals(req, res, next) {
  try {
    const { storeId } = req.query;
    const products = await productService.getTopDealsService(10, storeId || undefined);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
}

export async function getDailyEssentials(req, res, next) {
  try {
    const { storeId } = req.query;
    const products = await productService.getDailyEssentialsService(12, storeId || undefined);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
}

export async function getRelatedProducts(req, res, next) {
  try {
    const { storeId } = req.query;
    // getProductByIdService also enforces store visibility on the main product
    const product = await productService.getProductByIdService(req.params.id, storeId || undefined);
    const related = await productService.getRelatedProductsService(req.params.id, product.category.slug, 8, storeId || undefined);
    res.json({ success: true, products: related });
  } catch (err) {
    next(err);
  }
}

export async function getActiveBanners(req, res, next) {
  try {
    const banners = await getActiveBannersService();
    res.json({ success: true, banners });
  } catch (err) {
    next(err);
  }
}

export async function getVisibleSections(req, res, next) {
  try {
    const sections = await getVisibleSectionsService();
    res.json({ success: true, sections });
  } catch (err) {
    next(err);
  }
}

export async function getPublicDeliveryConfig(req, res, next) {
  try {
    const config = await getDeliveryConfigService();
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
}

export async function getPublicDeliveryZone(req, res, next) {
  try {
    const zone = await getDeliveryZoneService();
    res.json({ success: true, zone });
  } catch (err) {
    next(err);
  }
}

export async function getPublicStores(req, res, next) {
  try {
    const stores = await getActiveStoresService();
    res.json({ success: true, stores });
  } catch (err) {
    next(err);
  }
}

export async function getLabeledProducts(req, res, next) {
  try {
    const { label, limit = '12', storeId } = req.query;
    const products = await productService.getLabeledProductsService(label, parseInt(limit), storeId || undefined);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
}

export async function validateCart(req, res, next) {
  try {
    const { storeId, items } = req.body;
    if (!storeId) return res.status(400).json({ success: false, message: 'storeId is required' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, unavailableItems: [] });
    }
    const result = await productService.validateCartService(storeId, items);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
