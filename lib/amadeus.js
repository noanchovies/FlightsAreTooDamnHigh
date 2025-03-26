// FILE: lib/amadeus.js

import Amadeus from 'amadeus';

const amadeusApiKey = process.env.AMADEUS_API_KEY;
const amadeusApiSecret = process.env.AMADEUS_API_SECRET;

// Ensure environment variables are loaded correctly
if (!amadeusApiKey || !amadeusApiSecret) {
  console.error('Missing Amadeus API Key or Secret in environment variables');
  // For serverless functions, it's better to throw or handle so the function doesn't proceed partially
  // throw new Error('Amadeus API Key or Secret is not defined in environment variables');
}

// Initialize Amadeus client for PRODUCTION
const amadeus = new Amadeus({
  clientId: amadeusApiKey,
  clientSecret: amadeusApiSecret,
  hostname: 'production' // Use Production environment
});

export default amadeus;