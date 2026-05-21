// OrderHistoryPage — renders the account dashboard pre-selected on the "orders" tab.
// The full order list + detail (Blinkit-style two-panel layout) lives in ProfilePage.

import ProfilePage from './ProfilePage.jsx';

export default function OrderHistoryPage() {
  return <ProfilePage defaultSection="orders" />;
}
