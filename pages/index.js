import { useState } from 'react';
// Ensure this path is correct and points to your updated JSON file
import airports from '../data/airports.json';

export default function FlightSearch() {
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  // Add back date state, initialize to empty string
  const [date, setDate] = useState('');
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  // Add error state
  const [error, setError] = useState(null);
  // State to track if a search has been attempted
  const [searchAttempted, setSearchAttempted] = useState(false);


  // --- Autocomplete Suggestions ---
  // Use Object.keys() to get city names from the imported JSON
  const citySuggestions = (input) => {
    if (!input) return []; // Return empty array if input is empty
    const inputLower = input.toLowerCase();
    return Object.keys(airports).filter(city =>
      city.toLowerCase().includes(inputLower)
    ).slice(0, 10); // Limit suggestions for performance
  }

  // --- Search Flights via API ---
  const searchFlights = async (e) => {
    e.preventDefault();
    // Basic validation
    if (!fromCity || !toCity || !date) {
      setError("Please fill in From city, To city, and select a Date.");
      setFlights([]);
      setSearchAttempted(false); // Reset search attempt status
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors
    setFlights([]); // Clear previous results
    setSearchAttempted(true); // Mark that a search was attempted


    try {
      // Encode city names for URL and match backend query param names
      // ** CORRECTED API URL CONSTRUCTION **
      const apiUrl = `/api/search?fromCity=${encodeURIComponent(fromCity)}&toCity=${encodeURIComponent(toCity)}&date=${date}`;
      console.log("Calling API:", apiUrl); // Log API call for debugging

      const res = await fetch(apiUrl);

      if (!res.ok) {
        // Try to parse error JSON from backend
        let errorData = { message: `HTTP error! Status: ${res.status}` };
        try {
          errorData = await res.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        console.error("API Error Response:", errorData);
        // Use detailed error from backend if available
        throw new Error(errorData.details || errorData.error || errorData.message);
      }

      const data = await res.json();
      console.log("API Success Response:", data);
      setFlights(data.flights || []);
      if (!data.flights || data.flights.length === 0) {
         // setError("No flights found matching your criteria."); // Optionally set error if no flights
      }

    } catch (err) {
      console.error("Failed to fetch flights:", err);
      setError(err.message || "An unknown error occurred while fetching flights.");
      setFlights([]); // Ensure flights are cleared on error
    } finally {
      setLoading(false);
    }
  };

  // --- Get Today's Date for min attribute in date input ---
  const getTodayDateString = () => {
    const today = new Date();
    // Format YYYY-MM-DD
    return today.toISOString().split('T')[0];
  };


  return (
    // Basic styling for layout - will be replaced by Tailwind later
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        {/* Ensure logo.png is in the public folder */}
        <img src="/logo.png" alt="App Logo" style={{ height: '60px', marginBottom: '10px' }} />
        <h1>Flights Are Too Damn High</h1>
      </header>

      {/* --- Search Form --- */}
      <form onSubmit={searchFlights} style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {/* From City Input */}
          <div>
            <label htmlFor="fromCityInput" style={{ display: 'block', marginBottom: '5px' }}>From:</label>
            <input
              id="fromCityInput"
              type="text"
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              placeholder="Origin city (e.g., Lisbon)"
              list="fromCitiesDatalist"
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
              required // Add basic required validation
            />
            <datalist id="fromCitiesDatalist">
              {citySuggestions(fromCity).map(city => (
                <option key={`from-${city}`} value={city} />
              ))}
            </datalist>
          </div>

          {/* To City Input */}
          <div>
            <label htmlFor="toCityInput" style={{ display: 'block', marginBottom: '5px' }}>To:</label>
            <input
              id="toCityInput"
              type="text"
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              placeholder="Destination city (e.g., Hamburg)"
              list="toCitiesDatalist"
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
              required // Add basic required validation
            />
            <datalist id="toCitiesDatalist">
              {citySuggestions(toCity).map(city => (
                <option key={`to-${city}`} value={city} />
              ))}
            </datalist>
          </div>
        </div>

         {/* Date Input */}
         <div>
            <label htmlFor="dateInput" style={{ display: 'block', marginBottom: '5px' }}>Date:</label>
            <input
              id="dateInput"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              // Set min date to today
              min={getTodayDateString()}
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
              required // Add basic required validation
            />
          </div>


        <button type="submit" disabled={loading} style={{ padding: '12px 20px', cursor: 'pointer' }}>
          {loading ? 'Searching...' : 'Find Cheap Flights'}
        </button>
      </form>

      {/* --- Error Display --- */}
      {error && (
        <div style={{ color: 'red', background: '#ffebee', border: '1px solid red', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* --- Loading Indicator --- */}
      {loading && (
        <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '1.2em' }}>
          Loading flights... ✈️
        </div>
      )}


      {/* --- Flight Results --- */}
      <div style={{ marginTop: '30px' }}>
        {/* Show message only if search attempted, not loading, no errors, and no flights found */}
        {searchAttempted && !loading && !error && flights.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', background: '#f0f0f0', borderRadius: '5px' }}>
            No flights found matching your criteria for {fromCity} to {toCity} on {date}.
          </div>
        )}

        {/* Display Flight Cards if flights exist */}
        {!loading && !error && flights.length > 0 && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <h2>Flight Results ({flights.length}):</h2>
            {flights.map((flight) => (
              // Basic Flight Card Structure - We will style this with Tailwind later
              <div key={flight.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', background: '#f9f9f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>{flight.airlineName} ({flight.airlineCode})</span>
                  <span style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{flight.price} {flight.currency}</span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <span>{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({flight.origin})</span>
                  <span> → </span>
                  <span>{new Date(flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({flight.destination})</span>
                  <span style={{ marginLeft: '15px', color: '#555' }}>({flight.duration.replace('PT', '').toLowerCase()})</span>
                </div>
                <div>
                  {/* ** CORRECTED STYLE PROP ** */}
                  <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: flight.stops === 0 ? '#e0f2f7' : flight.isHiddenCity ? '#fff8e1' : '#fce4ec', // Correct hex, comma after this line
                      color: flight.stops === 0 ? '#007bff' : flight.isHiddenCity ? '#ff8f00' : '#d81b60',       // Comma after this line
                      fontSize: '0.9em' // No comma needed for last property
                     }}>
                     {flight.stops === 0 ? 'Direct' : flight.isHiddenCity ? 'Layover (Hidden City)' : `${flight.stops} Stop(s)`}
                     {!flight.isHiddenCity && flight.stops > 0 ? ` (Final: ${flight.destination})` : ''}
                  </span>
                </div>
                 {/* Booking Link */}
                 <div style={{ marginTop: '15px' }}>
                   <a
                     href={flight.bookingLink}
                     target="_blank"
                     rel="noopener noreferrer"
                     style={{
                       display: 'inline-block',
                       padding: '8px 15px',
                       background: '#0066EE',
                       color: 'white',
                       textDecoration: 'none',
                       borderRadius: '4px'
                     }}
                   >
                     View Offer ↗️
                   </a>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
