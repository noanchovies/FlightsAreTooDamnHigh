// FILE: pages/api/search.js (on simplify-test branch)

import airportsData from '../../data/airports.json';
import amadeus from '../../lib/amadeus';

const getAirportCodes = (cityName) => {
  const foundKey = Object.keys(airportsData).find(key => key.toLowerCase() === cityName.toLowerCase());
  return foundKey ? airportsData[foundKey] : null;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') { /* ... */ } // Keep validation

  const { fromCity, toCity, date } = req.query;
  console.log(`API Route Received: fromCity=${fromCity}, toCity=${toCity}, date=${date}`);
  if (!fromCity || !toCity || !date) { /* ... */ } // Keep validation

  const originCodes = getAirportCodes(fromCity);
  const destinationCodes = getAirportCodes(toCity);
  if (!originCodes || !destinationCodes) { /* ... */ } // Keep validation

  const originLocationCode = originCodes.join(',');
  const destinationLocationCode = destinationCodes.join(',');

  const keyLoaded = process.env.AMADEUS_API_KEY ? 'Loaded (ends with ' + process.env.AMADEUS_API_KEY.slice(-4) + ')' : 'MISSING!';
  const secretLoaded = process.env.AMADEUS_API_SECRET ? 'Loaded (ends with ' + process.env.AMADEUS_API_SECRET.slice(-4) + ')' : 'MISSING!';
  console.log(`DEBUG: AMADEUS_API_KEY status = ${keyLoaded}`);
  console.log(`DEBUG: AMADEUS_API_SECRET status = ${secretLoaded}`);

  try {
    console.log(`Attempting Amadeus Search: ${originLocationCode} -> ${destinationLocationCode} on ${date}`);
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originLocationCode,
      destinationLocationCode: destinationLocationCode,
      departureDate: date,
      adults: 1,
      max: 5,
      currencyCode: 'EUR'
    });

    const offers = response.data || [];
    console.log(`Amadeus returned ${offers.length} offers (raw).`);
    // Process results (simplified for now)
    const simplifiedFlights = offers.slice(0, 5).map(offer => ({ /* ... */ }));
    res.status(200).json({ flights: simplifiedFlights, rawOfferCount: offers.length });

  } catch (error) {
    // --- !! REVISED ERROR HANDLING !! ---
    console.error('--- AMADEUS API ERROR ---');
    // Log the raw error object to see its structure
    console.error('Raw Error Object:', error);

    // Attempt to get details from SDK-specific properties or generic message
    const errorDescription = error.description; // Common in amadeus-node errors
    const errorMessageGeneric = error.message;
    const errorCode = error.code; // e.g., network errors like ENOTFOUND

    // Determine status code - default to 500 if no response object
    let statusCode = error.response ? error.response.status : 500;
    // Refine status code based on SDK error code if appropriate
    if (!error.response && errorCode === 'AuthenticationError') { // Check if SDK uses specific error codes
        statusCode = 401;
    } else if (!error.response && errorCode === 'NotFoundError') {
        statusCode = 404; // Example
    } else if (!error.response && (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED')) {
        statusCode = 503; // Service Unavailable / Network Error
    }

    console.error('Status Code Determined:', statusCode);
    console.error('Error Description (from SDK):', errorDescription);
    console.error('Generic Error Message:', errorMessageGeneric);
    console.error('Error Code:', errorCode);
    console.error('Attempted Search Params:', { originLocationCode, destinationLocationCode, date });
    console.error('--- END AMADEUS API ERROR ---');

    // Construct response message
    let responseMessage = `Failed to fetch flights. Status: ${statusCode}.`;
    if (errorDescription) {
        responseMessage += ` Details: ${errorDescription}`;
    } else if (errorMessageGeneric) {
        responseMessage += ` Message: ${errorMessageGeneric}`;
    }

    res.status(statusCode).json({
      message: responseMessage,
      // Optionally include code or description if useful for frontend
      errorCode: errorCode,
      errorDescription: errorDescription
    });
  }
}
