import axios from 'axios';
import airportsData from '../../data/airports.json'; // Ensure path is correct
import amadeus from '../../lib/amadeus'; // Ensure path is correct

// Helper function to get airport code from city name
const getAirportCode = (cityName) => {
  // Normalize city name for matching (lowercase, trim)
  const normalizedCity = cityName.trim().toLowerCase();
  // Find the city in the keys of airportsData
  const cityKey = Object.keys(airportsData).find(key => key.toLowerCase() === normalizedCity);
  // Return the IATA code if found, otherwise null or handle error
  return cityKey ? airportsData[cityKey].iata : null;
};

export default async function handler(req, res) {
  // Basic validation for GET request
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { fromCity, toCity, date } = req.query;

  // Validate required query parameters
  if (!fromCity || !toCity || !date) {
    return res.status(400).json({ message: 'Missing required query parameters: fromCity, toCity, date' });
  }

  // --- Get Airport Codes ---
  const originLocationCode = getAirportCode(fromCity);
  const destinationLocationCode = getAirportCode(toCity);

  if (!originLocationCode || !destinationLocationCode) {
    const missingCodes = [];
    if (!originLocationCode) missingCodes.push(fromCity);
    if (!destinationLocationCode) missingCodes.push(toCity);
    console.error(`Could not find airport codes for: ${missingCodes.join(', ')}`);
    return res.status(400).json({
      message: `Could not find airport codes for one or more cities: ${missingCodes.join(', ')}`,
      details: `Failed cities: ${missingCodes.join(', ')}`
    });
  }

  // --- Call Amadeus API ---
  try {
    console.log(`Searching flights: ${originLocationCode} -> ${destinationLocationCode} on ${date}`);

    // Amadeus API requires adults parameter, defaulting to 1
    const adults = 1;
    const maxResults = 20; // Limit results

    // Use the Amadeus SDK client initialized in lib/amadeus.js
    // The SDK handles token fetching/refreshing automatically if initialized correctly
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originLocationCode,
      destinationLocationCode: destinationLocationCode,
      departureDate: date,
      adults: adults,
      max: maxResults,
      currencyCode: 'EUR' // Example currency
    });

    // --- Process Response ---
    if (response.data && response.data.length > 0) {
      const flights = response.data.map((offer) => {
        const itinerary = offer.itineraries[0]; // Assuming one itinerary per offer for simplicity
        const segment = itinerary.segments[0]; // Assuming one segment for direct/simple flights

        // Basic check for hidden city (simplified)
        const isHiddenCity = itinerary.segments.length > 1 && segment.arrival.iataCode !== destinationLocationCode;

        return {
          id: offer.id,
          airlineCode: segment.carrierCode,
          airlineName: segment.carrierCode, // Placeholder - dictionary lookup needed for full name
          departureTime: segment.departure.at,
          arrivalTime: itinerary.segments[itinerary.segments.length - 1].arrival.at, // Arrival time of the last segment
          origin: segment.departure.iataCode,
          destination: itinerary.segments[itinerary.segments.length - 1].arrival.iataCode, // Final arrival airport
          duration: itinerary.duration,
          price: offer.price.total,
          currency: offer.price.currency,
          stops: itinerary.segments.length - 1,
          isHiddenCity: isHiddenCity, // Mark if potentially a hidden city itinerary
          bookingLink: `https://www.google.com/flights?q=Flights+from+${originLocationCode}+to+${destinationLocationCode}+on+${date}` // Example booking link
        };
      });

      // Include Amadeus API usage from response headers if available
      const usage = response.result?.meta?.count; // Example path, adjust based on actual response structure
      console.log(`Amadeus API call successful. Usage count: ${usage || 'N/A'}`);

      res.status(200).json({ flights: flights, usage: usage });

    } else {
      console.log('No flight offers found by Amadeus.');
      res.status(200).json({ flights: [], message: 'No flight offers found matching your criteria.' });
    }

  } catch (error) {
    // Log the detailed error from Amadeus if available
    const amadeusError = error.response ? error.response.data : error.message;
    console.error('Amadeus API request failed:', JSON.stringify(amadeusError, null, 2));

    // Determine the status code to send back
    const statusCode = error.response ? error.response.status : 500;
    let errorMessage = 'Failed to fetch flight offers.';

    if (statusCode === 401) {
      errorMessage = 'Amadeus API request failed with status 401 (Unauthorized). Check API Key/Secret and environment (Test vs Production).';
    } else if (statusCode === 400) {
      errorMessage = `Amadeus API request failed with status 400 (Bad Request). Check parameters: ${JSON.stringify(amadeusError?.errors || amadeusError)}`;
    } else if (statusCode === 429) {
      errorMessage = 'Amadeus API rate limit exceeded.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
       errorMessage = `Network error connecting to Amadeus API. Check hostname and connectivity.`;
    }

    res.status(statusCode).json({
      message: errorMessage,
      details: amadeusError // Forward detailed error if available
    });
  }
}
