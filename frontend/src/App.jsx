import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Customer pages
import HomePage            from './pages/HomePage.jsx';
import CartPage            from './pages/CartPage.jsx';
import ProfilePage         from './pages/ProfilePage.jsx';
import OrderHistoryPage    from './pages/OrderHistoryPage.jsx';
import ProductListingPage  from './pages/ProductListingPage.jsx';
import ProductDetailPage   from './pages/ProductDetailPage.jsx';
import HisaabPage          from './pages/HisaabPage.jsx';
import SavedListPage       from './pages/SavedListPage.jsx';
import SubscribedListPage      from './pages/SubscribedListPage.jsx';
import DeliveryTrackingPage   from './pages/DeliveryTrackingPage.jsx';
import ContactPage            from './pages/ContactPage.jsx';
import FaqPage                from './pages/FaqPage.jsx';
import ReturnPolicyPage       from './pages/ReturnPolicyPage.jsx';
import PrivacyPolicyPage      from './pages/PrivacyPolicyPage.jsx';
import TermsPage              from './pages/TermsPage.jsx';

// Admin pages
import AdminLoginPage      from './pages/AdminLoginPage.jsx';
import AdminDashboardPage  from './pages/AdminDashboardPage.jsx';
import AdminOrdersPage     from './pages/AdminOrdersPage.jsx';
import AdminUsersPage      from './pages/AdminUsersPage.jsx';
import AdminProductsPage   from './pages/AdminProductsPage.jsx';
import AdminCategoriesPage from './pages/AdminCategoriesPage.jsx';
import AdminBannersPage    from './pages/AdminBannersPage.jsx';
import AdminSectionsPage   from './pages/AdminSectionsPage.jsx';
import AdminSlotsPage      from './pages/AdminSlotsPage.jsx';
import AdminStoresPage     from './pages/AdminStoresPage.jsx';
import AdminInventoryPage  from './pages/AdminInventoryPage.jsx';

// Auth stores
import { useIsAuthenticated }      from './store/authStore.js';
import { useIsAdminAuthenticated } from './store/adminAuthStore.js';

// ─── Route Guards ─────────────────────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const isAuthed = useIsAuthenticated();
  return isAuthed ? children : <Navigate to="/?auth=required" replace />;
}

function AdminRoute({ children }) {
  const isAdmin = useIsAdminAuthenticated();
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Customer routes ─────────────────────────────────────────────── */}
        <Route path="/"              element={<HomePage />} />
        <Route path="/products"      element={<ProductListingPage />} />
        <Route path="/products/:id"  element={<ProductDetailPage />} />
        <Route path="/cart"          element={<CartPage />} />

        {/* Public delivery tracking — no auth needed, shareable link */}
        <Route path="/track/:orderId" element={<DeliveryTrackingPage />} />

        <Route path="/hisaab"        element={<ProtectedRoute><HisaabPage /></ProtectedRoute>} />
        <Route path="/saved"         element={<ProtectedRoute><SavedListPage /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><SubscribedListPage /></ProtectedRoute>} />
        <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/orders"        element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        {/* ── Info / policy pages ─────────────────────────────────────────── */}
        <Route path="/contact"        element={<ContactPage />} />
        <Route path="/faq"            element={<FaqPage />} />
        <Route path="/return-policy"  element={<ReturnPolicyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms"          element={<TermsPage />} />

        {/* /dashboard redirects to admin panel */}
        <Route path="/dashboard"     element={<Navigate to="/admin/dashboard" replace />} />

        {/* ── Admin routes ────────────────────────────────────────────────── */}
        <Route path="/admin/login"      element={<AdminLoginPage />} />
        <Route path="/admin"            element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard"  element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/orders"     element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
        <Route path="/admin/users"      element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/products"   element={<AdminRoute><AdminProductsPage /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategoriesPage /></AdminRoute>} />
        <Route path="/admin/banners"    element={<AdminRoute><AdminBannersPage /></AdminRoute>} />
        <Route path="/admin/sections"   element={<AdminRoute><AdminSectionsPage /></AdminRoute>} />
        <Route path="/admin/slots"      element={<AdminRoute><AdminSlotsPage /></AdminRoute>} />
        <Route path="/admin/stores"     element={<AdminRoute><AdminStoresPage /></AdminRoute>} />
        <Route path="/admin/inventory"  element={<AdminRoute><AdminInventoryPage /></AdminRoute>} />

        {/* ── Fallback ────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
