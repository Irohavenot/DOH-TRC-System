// src/utils/emailjs.ts
import emailjs from '@emailjs/browser';

const initEmailJS = () => {
  emailjs.init({
    publicKey: 'YOUR_PUBLIC_USER_ID', // e.g., 'user_ABC123...'
    // Optional: block headless browsers (adds security)
    blockHeadless: true,
  });
};

export default initEmailJS;