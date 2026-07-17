import axios from 'axios';
import { showAlert } from './alert';
// Replace this with your actual Stripe publishable key from your Stripe dashboard

export const bookTour = async (tourId) => {
  try {
    const stripeKey = document.getElementById('book-tour').dataset.stripekey;
    const stripe = Stripe(stripeKey);
    //1)Get checkout session from endpoint from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2)Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.error('Stripe error:', err);
    showAlert(
      'error',
      err.message || 'Could not process payment. Please try again.',
    );
  }
};
