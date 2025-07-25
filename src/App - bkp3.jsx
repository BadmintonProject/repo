// IMPORTANT: If you are seeing "SyntaxError: Unexpected token '<'",
// or "[plugin:vite:react-babel] ... Unexpected token (45:2)",
// it means your environment is trying to run JSX directly without transpilation,
// or there might be an invisible character or syntax issue on a preceding line.
// React applications using JSX require a build step (e.g., with Babel, Webpack,
// Create React App, Next.js, or Vite) to convert JSX into standard JavaScript.
// Ensure your project is set up with a proper React development environment.

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// Your Supabase project URL and anon key
// For production, it's highly recommended to use environment variables
// (e.g., process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY)
// instead of hardcoding them directly here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Using environment variable
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // Using environment variable

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- UserBookingsPage Component ---
// This component allows regular users to see all future bookings and join/leave them.
function UserBookingsPage({ session, onLogout, setView }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingMessage, setBookingMessage] = useState('');
  const [allUsersMap, setAllUsersMap] = useState({}); // To map user IDs to names

  const currentUserId = session?.user?.id;

  // Fetch all users to create a mapping for display names
  useEffect(() => {
    const fetchAllUsers = async () => {
      const { data, error } = await supabase.from('users').select('id, name'); // Corrected from user_id to id
      if (data) {
        const map = {};
        data.forEach(user => {
          //map[user.id] = user.name || user.email; // Fallback to email if name is null
		  map[user.id] = user.name; // Fallback to email if name is null
        });
        setAllUsersMap(map);
      }
      if (error) console.error("Error fetching all users for mapping:", error.message);
    };
    fetchAllUsers();
  }, []); // Run once on mount

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const todayFormatted = `${year}-${month}-${day}`;

      // Fetch all future bookings
      const { data, error } = await supabase
        .from('sessions')
        .select('sessions_id, location, court, date_time, created_by, players_attending') // Include players_attending
        .gte('date_time', todayFormatted)
        .order('date_time', { ascending: true });

      if (error) {
        throw error;
      }
      console.log('Data fetched by fetchBookings:', data); // Log data before setting state
      setBookings(data);
    } catch (error) {
      console.error("Error fetching all bookings:", error.message);
      setBookingMessage(`Error fetching bookings: ${error.message}`);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUserId]); // Re-fetch bookings if current user changes

  const handleJoinLeaveBooking = async (bookingId, currentPlayers, action) => {
    setBookingMessage('');
    try {
      // Ensure currentPlayers is an array, even if null or undefined
      const safeCurrentPlayers = currentPlayers || [];
      let newPlayersAttending;

      if (action === 'join') {
        // Add current user to players_attending if not already there
        if (!safeCurrentPlayers.includes(currentUserId)) {
          newPlayersAttending = [...safeCurrentPlayers, currentUserId];
        } else {
          setBookingMessage('You are already attending this booking.');
          return;
        }
      } else { // action === 'leave'
        // Remove current user from players_attending
        if (safeCurrentPlayers.includes(currentUserId)) {
          newPlayersAttending = safeCurrentPlayers.filter(id => id !== currentUserId);
        } else {
          setBookingMessage('You are not currently attending this booking.');
          return;
        }
      }

      console.log('Attempting to update players_attending to:', newPlayersAttending); // New log here

      const { data: updateData, error: updateError } = await supabase
        .from('sessions')
        .update({ players_attending: newPlayersAttending })
        .eq('sessions_id', bookingId);

      if (updateError) {
        console.error("Supabase update error:", updateError); // Log the actual Supabase error
        throw updateError;
      }
      console.log("Supabase update successful, data:", updateData); // Log success data

      setBookingMessage(`Successfully ${action === 'join' ? 'joined' : 'left'} the booking.`);
      fetchBookings(); // Refresh the list to reflect changes
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error.message);
      setBookingMessage(`Failed to ${action} booking: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">All Court Bookings</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setView('welcome')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Back to Welcome
            </button>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Logout
            </button>
          </div>
        </div>

        <h3 className="text-2xl font-semibold text-gray-700 mb-4">Upcoming Bookings</h3>

        {bookingMessage && (
          <div className={`p-3 mb-4 rounded-lg text-center font-semibold ${bookingMessage.startsWith('Error') || bookingMessage.startsWith('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {bookingMessage}
          </div>
        )}

        {loadingBookings ? (
          <p className="text-gray-600 text-center py-8">Loading bookings...</p>
        ) : bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const bookedByUserName = allUsersMap[booking.created_by] || booking.created_by;
              // Ensure players_attending is an array before using includes
              const isAttending = (booking.players_attending || []).includes(currentUserId);
              const attendingNames = (booking.players_attending || [])
                ?.map(id => allUsersMap[id] || id)
                .filter(name => name !== bookedByUserName) // Don't list creator twice if they are also in players_attending
                .join(', ');

              return (
                <div key={booking.sessions_id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <p className="text-xl font-bold text-blue-700 mb-2">{booking.court}</p>
                  <p className="text-md text-gray-700">Location: {booking.location}</p>
                  <p className="text-md text-gray-700">Date & Time: {new Date(booking.date_time).toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mb-2">Booked by: <span className="font-semibold">{bookedByUserName}</span></p>

                  {booking.players_attending && booking.players_attending.length > 0 && (
                    <p className="text-sm text-gray-600 mb-4">
                      Attending: <span className="font-semibold">
                        {bookedByUserName}
                        {attendingNames ? `, ${attendingNames}` : ''}
                      </span>
                    </p>
                  )}

                  {currentUserId && ( // Only show buttons if a user is logged in
                    <div className="mt-4">
                      {isAttending ? (
                        <button
                          onClick={() => handleJoinLeaveBooking(booking.sessions_id, booking.players_attending, 'leave')}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Leave Booking
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinLeaveBooking(booking.sessions_id, booking.players_attending, 'join')}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Join Booking
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No upcoming bookings found.</p>
        )}
      </div>
    </div>
  );
}


// --- WelcomePage Component ---
// This component displays existing bookings or an option to book.
function WelcomePage({ session, onLogout, setView }) {
  const [badmintonBookings, setBadmintonBookings] = useState([]);
  const [tennisBookings, setTennisBookings] = useState([]);
  const [allBookingsForAdmin, setAllBookingsForAdmin] = useState([]); // To store all bookings if admin
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [allUsersMap, setAllUsersMap] = useState({}); // To map user IDs to names
  const [cancelMessage, setCancelMessage] = useState('');

  // Check if the current user is an admin
  const isAdmin = session?.user?.user_metadata?.user_type === 'Admin';

  // Fetch all users to create a mapping for display names
  useEffect(() => {
    const fetchAllUsers = async () => {
      const { data, error } = await supabase.from('users').select('id, name');
      if (data) {
        const map = {};
        data.forEach(user => {
          map[user.id] = user.name || user.email; // Fallback to email if name is null
        });
        setAllUsersMap(map);
      }
      if (error) console.error("Error fetching all users for mapping:", error.message);
    };
    fetchAllUsers();
  }, []); // Run once on mount

  useEffect(() => {
    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const todayFormatted = `${year}-${month}-${day}`;

        let query = supabase
          .from('sessions')
          .select('sessions_id, location, court, date_time, created_by');

        // If not admin, filter by current user's ID. If admin, fetch all.
        if (!isAdmin) {
          query = query.eq('created_by', session.user.id);
        }

        const { data, error } = await query
          .gte('date_time', todayFormatted)
          .order('date_time', { ascending: true });

        if (error) {
          throw error;
        }

        const badminton = data.filter(item => item.court.toLowerCase().includes('badminton'));
        const tennis = data.filter(item => item.court.toLowerCase().includes('tennis'));

        setBadmintonBookings(badminton);
        setTennisBookings(tennis);
        setAllBookingsForAdmin(data); // Store all bookings if admin for cancellation
        console.log('Fetched bookings (badminton):', badminton);
        console.log('Fetched bookings (tennis):', tennis);

      } catch (error) {
        console.error("Error fetching bookings:", error.message);
        setBadmintonBookings([]);
        setTennisBookings([]);
        setAllBookingsForAdmin([]);
      } finally {
        setLoadingBookings(false);
      }
    };

    if (session) {
      fetchBookings();
    }
  }, [session, isAdmin]); // Re-fetch if session or admin status changes

  const handleCancelBooking = async (bookingId) => {
    setCancelMessage('');
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('sessions_id', bookingId);

      if (error) {
        throw error;
      }

      setCancelMessage('Booking cancelled successfully!');
      fetchBookings(); // Refresh the list after cancellation
    } catch (error) {
      console.error("Error cancelling booking:", error.message);
      setCancelMessage(`Failed to cancel booking: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">
            Welcome, {session.user?.email || session.user?.id || 'User'}!
          </h2>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Logout
          </button>
        </div>

        {/* New: Images Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="relative rounded-lg overflow-hidden shadow-lg">
            <img
              src="https://placehold.co/600x400/ADD8E6/000000?text=Badminton+Court"
              alt="Badminton Court"
              className="w-full h-auto object-cover rounded-lg"
              onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/600x400/ADD8E6/000000?text=Image+Load+Error"; }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <p className="text-white text-xl font-bold">Enjoy Badminton!</p>
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden shadow-lg">
            <img
              src="https://placehold.co/600x400/90EE90/000000?text=Tennis+Court"
              alt="Tennis Court"
              className="w-full h-auto object-cover rounded-lg"
              onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/600x400/90EE90/000000?text=Image+Load+Error"; }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <p className="text-white text-xl font-bold">Play Tennis!</p>
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-semibold text-gray-700 mb-4">Your Court Bookings</h3>

        {loadingBookings ? (
          <p className="text-gray-600 text-center py-8">Loading your bookings...</p>
        ) : (
          <>
            {/* Badminton Bookings Section */}
            <div className="mb-6">
              <h4 className="text-xl font-bold text-gray-700 mb-3">Badminton Bookings</h4>
              {badmintonBookings.length > 0 ? (
                <div className="space-y-4">
                  {badmintonBookings.map((booking) => (
                    <div key={booking.sessions_id} className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm">
                      <p className="font-semibold text-blue-800">{booking.court} at {booking.location}</p>
                      <p className="text-sm text-gray-600">Date & Time: {new Date(booking.date_time).toLocaleString()}</p>
                      {booking.created_by && (
                        <p className="text-xs text-gray-500">
                          Booked by: <span className="font-semibold">
                            {allUsersMap[booking.created_by] || booking.created_by}
                          </span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No upcoming badminton bookings.</p>
              )}
            </div>

            {/* Tennis Bookings Section */}
            <div className="mb-6">
              <h4 className="text-xl font-bold text-gray-700 mb-3">Tennis Bookings</h4>
              {tennisBookings.length > 0 ? (
                <div className="space-y-4">
                  {tennisBookings.map((booking) => (
                    <div key={booking.sessions_id} className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
                      <p className="font-semibold text-green-800">{booking.court} at {booking.location}</p>
                      <p className="text-sm text-gray-600">Date & Time: {new Date(booking.date_time).toLocaleString()}</p>
                      {booking.created_by && (
                        <p className="text-xs text-gray-500">
                          Booked by: <span className="font-semibold">
                            {allUsersMap[booking.created_by] || booking.created_by}
                          </span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No upcoming tennis bookings.</p>
              )}
            </div>
          </>
        )}

        {/* Admin Cancellation Section */}
        {isAdmin && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-2xl font-bold text-red-700 mb-4">Admin: Cancel Court Bookings</h3>
            {cancelMessage && (
              <div className={`p-3 mb-4 rounded-lg text-center font-semibold ${cancelMessage.startsWith('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {cancelMessage}
              </div>
            )}
            {loadingBookings ? (
              <p className="text-gray-600 text-center py-4">Loading all bookings for admin...</p>
            ) : allBookingsForAdmin.length > 0 ? (
              <div className="space-y-4">
                {allBookingsForAdmin.map((booking) => (
                  <div key={booking.sessions_id} className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-red-800">{booking.court} at {booking.location}</p>
                      <p className="text-sm text-gray-600">Date & Time: {new Date(booking.date_time).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        Booked by: <span className="font-semibold">
                          {allUsersMap[booking.created_by] || booking.created_by}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelBooking(booking.sessions_id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No bookings available for cancellation.</p>
            )}
          </div>
        )}

        {/* Buttons for navigation */}
        <div className="text-center mt-6 flex justify-center space-x-4">
          <button
            onClick={() => setView('calendar')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Book a New Court
          </button>
          <button
            onClick={() => setView('userBookings')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            View All Bookings
          </button>
        </div>
      </div>
    </div>
  );
}

// --- CalendarPage Component ---
// This component allows users to select a court on a given day and time slot.
function CalendarPage({ session, onLogout, setView }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null); // New state for time slot
  const [bookingMessage, setBookingMessage] = useState('');

  const courts = ['Court 1 (Badminton)', 'Court 2 (Badminton)', 'Court 3 (Tennis)', 'Court 4 (Squash)']; // Example courts

  // Function to get the number of days in a month
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Function to get the first day of the month (0 for Sunday, 1 for Monday, etc.)
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  // Generate 1-hour time slots from 9:00 AM to 9:00 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 21; hour++) { // 9 AM to 9 PM (21:00)
      const startHour = hour;
      const endHour = hour + 1;
      const startTime = `${startHour.toString().padStart(2, '0')}:00`;
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      slots.push(`${startTime} - ${endTime}`);
    }
    return slots;
  };

  // Generate days for the calendar grid
  const generateCalendarDays = () => {
    const numDays = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Add leading empty cells for days before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add actual days of the month
    for (let i = 1; i <= numDays; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
      const isToday = date.toDateString() === today.toDateString();

      days.push(
        <div
          key={i}
          className={`p-2 cursor-pointer rounded-lg text-center font-medium text-gray-900
            ${isSelected ? 'bg-blue-500 text-white shadow-md' : ''}
            ${isToday && !isSelected ? 'bg-blue-100 text-blue-800' : ''}
            hover:bg-blue-200 transition duration-200 ease-in-out`}
          onClick={() => {
            setSelectedDate(date);
            setSelectedTimeSlot(null); // Reset time slot when date changes
            setBookingMessage('');
          }}
        >
          {i}
        </div>
      );
    }
    return days;
  };

  // Navigate to previous month
  const goToPrevMonth = () => {
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 0) {
        setCurrentYear(currentYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
    setSelectedDate(null); // Clear selection when changing month
    setSelectedCourt(null);
    setSelectedTimeSlot(null); // Clear time slot
    setBookingMessage('');
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 11) {
        setCurrentYear(currentYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
    setSelectedDate(null); // Clear selection when changing month
    setSelectedCourt(null);
    setSelectedTimeSlot(null); // Clear time slot
    setBookingMessage('');
  };

  const handleCourtSelection = (court) => {
    setSelectedCourt(court);
    setBookingMessage(''); // Clear previous messages
  };

  const handleTimeSlotSelection = (slot) => {
    setSelectedTimeSlot(slot);
    setBookingMessage(''); // Clear previous messages
  };

  const handleBookCourt = async () => {
    if (selectedDate && selectedCourt && selectedTimeSlot) {
      // Extract just the date part (YYYY-MM-DD)
      const datePart = selectedDate.toISOString().split('T')[0];
      // Extract the start time (e.g., "09:00") from the slot string "09:00 - 10:00"
      const timePart = selectedTimeSlot.split(' - ')[0];

      // Combine date and time to form an ISO 8601 string for Supabase timestamp
      // Example: "2025-08-10T09:00:00.000Z" (if Supabase expects timestamptz)
      // Or "2025-08-10 09:00:00" (if Supabase expects timestamp without timezone)
      // We'll use ISO string for robustness, Supabase usually handles it well.
      const fullDateTime = `${datePart}T${timePart}:00`; // YYYY-MM-DDTHH:MM:00

      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDateDisplay = selectedDate.toLocaleDateString(undefined, options);

      try {
        const { data, error } = await supabase
          .from('sessions') // Assuming 'sessions' is your table name
          .insert([
            {
              created_by: session.user.id,
              court: selectedCourt,
              date_time: fullDateTime, // Send the combined date and time
              location: 'Wanstead Leisure Centre', // Example: You might want to add a location selection
              status: 'Booked',
            }
          ]);
        if (error) throw error;

        setBookingMessage(`Successfully booked ${selectedCourt} on ${formattedDateDisplay} at ${selectedTimeSlot}!`);
        // Optionally, navigate back to the welcome page after booking
        // setView('welcome');
      } catch (error) {
        console.error("Error booking court:", error.message);
        setBookingMessage(`Failed to book court: ${error.message}`);
      }
    } else {
      setBookingMessage('Please select a date, a court, and a time slot to book.');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const timeSlots = generateTimeSlots(); // Generate time slots once

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">
            Court Booking Calendar
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setView('welcome')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Back to Welcome
            </button>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-t-lg mb-4">
          <button onClick={goToPrevMonth} className="px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200">
            &lt; Prev
          </button>
          <h3 className="text-xl font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button onClick={goToNextMonth} className="px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200">
            Next &gt;
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 text-gray-900 font-semibold text-center mb-4">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        {/* Added inline style for grid layout as a fallback/test */}
        <div
          className="grid grid-cols-7 gap-2 border border-gray-200 p-2 rounded-b-lg mb-6"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {generateCalendarDays()}
        </div>

        {/* Selected Date, Court, and Time Slot Selection */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h4 className="text-xl font-bold text-gray-800 mb-4">
            {selectedDate ? `Selected Date: ${selectedDate.toLocaleDateString()}` : 'Please select a date'}
          </h4>

          {selectedDate && (
            <>
              <h5 className="text-lg font-semibold mb-3">Select a Court:</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {courts.map((court) => (
                  <button
                    key={court}
                    onClick={() => handleCourtSelection(court)}
                    className={`p-3 rounded-lg border-2
                      ${selectedCourt === court ? 'bg-green-500 text-white border-green-600 shadow-md' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}
                      transition duration-200 ease-in-out transform hover:scale-105`}
                  >
                    {court}
                  </button>
                ))}
              </div>

              <h5 className="text-lg font-semibold mb-3 mt-6">Select a Time Slot:</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleTimeSlotSelection(slot)}
                    className={`p-3 rounded-lg border-2 text-sm
                      ${selectedTimeSlot === slot ? 'bg-purple-500 text-white border-purple-600 shadow-md' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'}
                      transition duration-200 ease-in-out transform hover:scale-105`}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              <button
                onClick={handleBookCourt}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                disabled={!selectedCourt || !selectedTimeSlot}
              >
                Book Selected Court
              </button>
            </>
          )}

          {bookingMessage && (
            <p className={`mt-4 text-center font-semibold ${bookingMessage.startsWith('Successfully') ? 'text-green-600' : 'text-red-600'}`}>
              {bookingMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state for Supabase auth
  const [view, setView] = useState('welcome'); // State to manage current view: 'welcome', 'calendar', or 'userBookings'

  useEffect(() => {
    // Function to get the session and set it
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (error) {
        console.error("Error getting initial session:", error.message);
      } finally {
        setLoading(false); // Set loading to false after attempt
      }
    };

    getInitialSession();

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false); // Also set loading to false on state change
        if (session) {
          setView('welcome'); // Reset to welcome page on successful login/auth state change
        }
      }
    );

    // Cleanup subscription on component unmount
    return () => subscription.unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true); // Show loading state during logout
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null); // Clear session on successful logout
      setView('welcome'); // Reset view to welcome after logout (though it will redirect to auth)
    } catch (error) {
      console.error("Error logging out:", error.message);
    } finally {
      setLoading(false); // Hide loading state
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">Loading authentication...</p>
      </div>
    );
  }

  if (!session) {
    // If no session, show the Auth UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Welcome!</h2>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google', 'github']} // Example providers, customize as needed
            redirectTo={window.location.origin} // Redirects back to the current page after auth
          />
        </div>
      </div>
    );
  } else {
    // If session exists, show the appropriate page based on 'view' state
    return (
      <>
        {view === 'welcome' && <WelcomePage session={session} onLogout={handleLogout} setView={setView} />}
        {view === 'calendar' && <CalendarPage session={session} onLogout={handleLogout} setView={setView} />}
        {view === 'userBookings' && <UserBookingsPage session={session} onLogout={handleLogout} setView={setView} />}
      </>
    );
  }
}
