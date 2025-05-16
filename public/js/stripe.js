import axios from 'axios';
import { showAlert } from './alert';
// Replace this with your actual Stripe publishable key from your Stripe dashboard
const stripe = Stripe('pk_test_51ROWwcH49y8rreKNrzw1PIe2drzkdhlPSahd124GNZq7HN3vVZtksPWuFTUt3JwaCm1csG8Bg3rCfLg3zRm3rRHM001OQG537F');

export const bookTour = async (tourId) => {
  try {
    //1)Get checkout session from endpoint from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session.data.session.id);
  
    // 2)Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.error('Stripe error:', err);
    showAlert('error', err.message || 'Could not process payment. Please try again.');
  }
};