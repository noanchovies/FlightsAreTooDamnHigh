// FILE: pages/api/search.js

import airportsData from '../../data/airports.json'; // Ensure path is correct
import amadeus from '../../lib/amadeus'; // Import the configured Amadeus client (using PRODUCTION hostname)

// Helper function (same as before)
const getAirportCodes = (cityName) => {
  const foundKey = Object.keys(airportsData).find(key => key.toLowerCase() === cityName.toLowerCase());
  return foundKey ? airportsData[foundKey] : null;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { fromCity, toCity, date } = req.query;

  // --- Log received parameters ---
  console.log(`API Route Received: fromCity=${fromCity}, toCity=${toCity}, date=${date}`);

  if (!fromCity || !toCity || !date) {
    return res.status(400).json({ message: 'Missing required query parameters: fromCity, toCity, date' });
  }

  // --- Airport Code Lookup ---
  const originCodes = getAirportCodes(fromCity);
  const destinationCodes = getAirportCodes(toCity);

  if (!originCodes) {
    console.error(`Origin city lookup failed for: ${fromCity}`);
    return res.status(400).json({ message: `Could not find airport codes for origin city: ${fromCity}` });
  }
  if (!destinationCodes) {
    console.error(`Destination city lookup failed for: ${toCity}`);
    return res.status(400).json({ message: `Could not find airport codes for destination city: ${toCity}` });
  }

  const originLocationCode = originCodes.join(',');
  const destinationLocationCode = destinationCodes.join(',');

  // --- !! DEBUG LOGGING FOR ENVIRONMENT VARIABLES !! ---
  // Check if the variables are loaded in the Vercel environment
  const keyLoaded = process.env.AMADEUS_API_KEY ? 'Loaded (ends with ' + process.env.AMADEUS_API_KEY.slice(-4) + ')' : 'MISSING!';
  const secretLoaded = process.env.AMADEUS_API_SECRET ? 'Loaded (ends with ' + process.env.AMADEUS_API_SECRET.slice(-4) + ')' : 'MISSING!';
  console.log(`DEBUG: AMADEUS_API_KEY status = ${keyLoaded}`);
  console.log(`DEBUG: AMADEUS_API_SECRET status = ${secretLoaded}`);
  // --- End Debug Logging ---

  // --- Call Amadeus API (Simplified) ---
  try {
    console.log(`Attempting Amadeus Search: ${originLocationCode} -> ${destinationLocationCode} on ${date}`);

    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originLocationCode,
      destinationLocationCode: destinationLocationCode,
      departureDate: date,
      adults: 1,
      max: 5, // Fetch fewer results for now
      currencyCode: 'EUR'
    });

    const offers = response.data || [];
    console.log(`Amadeus returned ${offers.length} offers (raw).`);

    // --- Basic Processing (No complex filtering yet) ---
    // Just return the raw data structure for now, or a simplified version if preferred
    const simplifiedFlights = offers.slice(0, 5).map(offer => ({
        id: offer.id,
        price: offer.price.total,
        currency: offer.price.currency,
        // Add other basic details if needed, directly from offer structure
        // Example: Get first segment's details
        firstSegment: offer.itineraries?.[0]?.segments?.[0]
    }));


    res.status(200).json({
         flights: simplifiedFlights, // Return simplified data
         rawOfferCount: offers.length // Include count of raw offers received
        });

  } catch (error) {
    // --- Log the Detailed Error ---
    const amadeusError = error.response ? error.response.data : error.description || error.message;
    const statusCode = error.response ? error.response.status : (error.code === 'AuthenticationError' ? 401 : 500);

    console.error('--- AMADEUS API ERROR ---');
    console.error('Status Code:', statusCode);
    console.error('Error Details:', JSON.stringify(amadeusError, null, 2));
    console.error('Attempted Search Params:', { originLocationCode, destinationLocationCode, date });
    console.error('--- END AMADEUS API ERROR ---');

    let errorMessage = 'Failed to fetch flight offers.';
    // Customize messages based on status code
    if (statusCode === 401) {
      errorMessage = `Amadeus API request failed: 401 Unauthorized. Check API Key/Secret ENV VARS in Vercel (Key ends: ${process.env.AMADEUS_API_KEY?.slice(-4)}, Secret ends: ${process.env.AMADEUS_API_SECRET?.slice(-4)}) and ensure Production keys match Production URL.`;
    } else if (statusCode === 400) {
       errorMessage = `Amadeus API request failed: 400 Bad Request. Check parameters (codes: ${originLocationCode}, ${destinationLocationCode}, date: ${date}). Details: ${JSON.stringify(amadeusError?.errors || amadeusError)}`;
    } // Add other status codes if needed

    res.status(statusCode).json({
      message: errorMessage,
      details: amadeusError
    });
  }
}
