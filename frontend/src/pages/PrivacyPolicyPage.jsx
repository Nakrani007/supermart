import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `When you use SuperMart, we collect the following information to provide you with our grocery delivery service:

• **Account information:** Name, email address, mobile number, and password (encrypted).
• **Delivery address:** Street address, area, city, pincode, and GPS coordinates (when you set location on the map).
• **Order information:** Items purchased, order history, payment method (we never store full card numbers).
• **Device information:** IP address, browser type, and device type — used to improve app performance.
• **Location data:** GPS coordinates when you use the map to set your delivery location (only with your permission).`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information solely to operate and improve our service:

• Process and deliver your orders to the correct address.
• Send order confirmations, updates, and delivery notifications via SMS/email.
• Detect fraud, prevent abuse, and maintain account security.
• Improve our product catalogue, delivery zones, and app experience.
• Respond to your support queries.

We do not sell, rent, or trade your personal information to third parties.`,
  },
  {
    title: '3. Payment Information',
    body: `SuperMart does not store your payment card details. All online payments are processed through PCI-DSS compliant payment gateways (Razorpay / PayU). We only receive a transaction confirmation ID from the payment gateway.

For UPI payments, only your UPI ID or virtual payment address (VPA) may be stored for convenience if you choose to save it.`,
  },
  {
    title: '4. Location Data',
    body: `We request location access only when you:
• Set a delivery address on the map, or
• Use the automatic location detection feature.

Location data is used only to verify delivery eligibility and show the nearest store. We do not track your location in the background. You can revoke location permission from your device/browser settings at any time.`,
  },
  {
    title: '5. Data Sharing',
    body: `Your data may be shared only in the following limited circumstances:

• **Delivery partners:** Your name, phone number, and delivery address are shared with our delivery staff to fulfill your order.
• **Legal compliance:** We may disclose information if required by law or a valid court order.
• **Business transfers:** In the event of a merger or acquisition, data may be transferred to the new entity under the same privacy terms.

We never share your data with advertisers or marketing companies.`,
  },
  {
    title: '6. Data Security',
    body: `We take reasonable precautions to protect your data:
• Passwords are encrypted using bcrypt.
• All data is transmitted over HTTPS/TLS.
• Access to customer data is restricted to authorised staff only.
• We perform regular security reviews.

No system is 100% secure. If you suspect unauthorised access to your account, contact us immediately at support@supermart.in.`,
  },
  {
    title: '7. Cookies',
    body: `We use cookies and localStorage to:
• Keep you logged in between sessions.
• Remember your cart items.
• Improve app performance.

You can clear cookies/localStorage from your browser settings, though this will log you out and clear your cart.`,
  },
  {
    title: '8. Children\'s Privacy',
    body: `SuperMart is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.`,
  },
  {
    title: '9. Your Rights',
    body: `You have the right to:
• **Access** the personal data we hold about you.
• **Correct** inaccurate data via your Profile page.
• **Delete** your account and all associated data (Profile → Account & Privacy → Delete Account).
• **Withdraw consent** for location access at any time via device settings.

For any data-related requests, email us at privacy@supermart.in.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page and notify you via email for significant changes.`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showSearch={false} />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">

        <div className="mb-2">
          <h1 className="text-2xl font-black text-gray-900">Privacy Policy</h1>
        </div>
        <p className="text-xs text-gray-400 mb-6">Last updated: 27 May 2026</p>

        <p className="text-sm text-gray-600 leading-relaxed bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
          At <strong>SuperMart</strong>, we respect your privacy and are committed to protecting the personal information you share with us. This policy explains what data we collect, how we use it, and your rights.
        </p>

        <div className="space-y-3">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-2">{sec.title}</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {sec.body.split('**').map((part, i) =>
                  i % 2 === 1
                    ? <strong key={i} className="text-gray-800 font-semibold">{part}</strong>
                    : <span key={i}>{part}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">Questions about this policy?</p>
          <a href="/contact" className="text-sm font-semibold text-brand-600 hover:underline">
            Contact us →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
