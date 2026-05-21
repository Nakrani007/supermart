import * as productService from './product.service.js';
import { getActiveBannersService, getVisibleSectionsService, getDeliveryConfigService } from '../admin/admin.service.js';

export async function getProducts(req, res, next) {
  try {
    const { category, search, page = '1', limit = '40', sort, minPrice, maxPrice, exclude } = req.query;
    const result = await productService.getAllProductsService({
      categorySlug: category,
      search,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      sort,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      exclude,
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
    const product = await productService.getProductByIdService(req.params.id);
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

export async function getTopDeals(req, res, next) {
  try {
    const products = await productService.getTopDealsService(10);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
}

export async function getDailyEssentials(req, res, next) {
  try {
    const products = await productService.getDailyEssentialsService(12);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
}

export async function getRelatedProducts(req, res, next) {
  try {
    const product = await productService.getProductByIdService(req.params.id);
    const related = await productService.getRelatedProductsService(req.params.id, product.category.slug);
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

export async function getLabeledProducts(req, res, next) {
  try {
    const { label, limit = '12' } = req.query;
    const products = await productService.getLabeledProductsService(label, parseInt(limit));
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
}
