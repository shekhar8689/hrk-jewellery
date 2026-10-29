import { RETURN_REPORT_WINDOW } from './policy'

/*
 * Questions and answers shown on the FAQ page and the Help Center.
 * Edit here once; both pages update.
 */
export const FAQS = [
  {
    category: 'Ordering & Payment',
    items: [
      { q: 'How do I place an order?', a: 'Open a product, choose the size or colour if there is a choice, and tap Add to Bag. Open the bag, tap Checkout, fill in your delivery details and tap Place Order & Pay. You can order as a guest; an account is optional.' },
      { q: 'How do I apply a coupon?', a: 'At checkout, type the code (for example FIRST10) in the Coupon code box and tap Apply. The discount shows in the total before you pay. Some coupons can be used only once per customer.' },
      { q: 'What payment methods are available?', a: 'Online payment by UPI: Google Pay, PhonePe, Paytm, BHIM or any UPI app. After placing the order you see a QR code with the exact amount; on a phone you can tap to open your UPI app. Cash on Delivery is not available.' },
      { q: 'What do I do after paying?', a: 'Type the 12-digit UPI transaction number (UPI Ref No. / UTR) from your payment app on the payment page and tap I have paid. We confirm your order as soon as the money shows in our account.' },
      { q: 'Can I change my payment method?', a: 'All orders are paid by UPI, and you can pay from any UPI app or bank account you like. If a payment failed, open your order from Track Order or My Orders and pay again.' },
      { q: 'How does my order progress?', a: 'Order placed → payment checked → Confirmed (we pack it) → Shipped (you get the courier name and tracking number) → Delivered. Each step shows with its date on the Track Order page.' },
      { q: 'Can I cancel my order?', a: 'An unpaid order can be cancelled from My Orders, and it cancels itself after 24 hours if not paid. For a paid order, message or call us before it ships and we cancel it and refund you by UPI.' },
      { q: 'What if my order is delayed?', a: 'Most orders arrive 3–5 business days after shipping; remote areas can take up to 7 days. Check the courier tracking link on the Track Order page. If it has not moved for 3 days, message us with your Order ID.' },
    ],
  },
  {
    category: 'Products & Quality',
    items: [
      { q: 'Are your products tarnish-free?', a: 'Yes! All HRK Jewellery products are made with high-quality tarnish-free metals and coatings that maintain their shine over time with proper care.' },
      { q: 'Are the products water-resistant?', a: 'Our jewellery is water-resistant, meaning it can withstand light contact with water. However, we recommend avoiding prolonged submersion, harsh chemicals, and perfumes to maintain the finish.' },
      { q: 'What materials do you use?', a: 'We use premium stainless steel, brass, and copper base metals with gold/silver plating. All materials are nickel-tested and safe for sensitive skin.' },
      { q: 'Are your products hypoallergenic?', a: 'Most of our products are nickel-free and suitable for sensitive skin. Check individual product descriptions for specific material information.' },
    ],
  },
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Orders are dispatched within 1–2 business days and delivered within 3–5 business days across India. Remote areas may take up to 7 days.' },
      { q: 'Is there a free shipping threshold?', a: 'Yes! We offer FREE shipping on all orders above ₹999. A flat shipping charge of ₹99 applies to orders below this amount.' },
      { q: 'Can I track my order?', a: 'Yes. Open the Track Order page (link at the bottom of every page) and enter your Order ID and mobile number. If you have an account, you can also see your orders under My Orders. Once shipped, you will see the courier name and tracking number there.' },
      { q: 'Do you deliver outside India?', a: 'Currently we only ship within India. International shipping is coming soon!' },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: `We don't accept returns for change of mind. If your order arrives damaged, defective or wrong, tell us within ${RETURN_REPORT_WINDOW} of delivery and we will replace it or refund you.` },
      { q: 'How do I initiate a return?', a: `Send us a message on the Contact page within ${RETURN_REPORT_WINDOW} of delivery, with your Order ID and photos of the item and packaging. We reply within 1–2 business days.` },
      { q: 'When will I receive my refund?', a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned item. They\'re sent back to the UPI account you paid from.' },
    ],
  },
  {
    category: 'Account & Payments',
    items: [
      { q: 'Do I need an account to place an order?', a: 'No! You can checkout as a guest. However, creating an account keeps all your orders in one place and lets you leave reviews.' },
      { q: 'Is my payment information secure?', a: 'Yes. You pay directly from your own UPI app (Google Pay, PhonePe, Paytm, BHIM…), so we never see or store your bank or card details. Only pay to the UPI ID and name shown on our payment page.' },
    ],
  },
]

