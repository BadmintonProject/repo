import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- UserAdminPage Component ---
// This component displays a list of all users from the 'profiles' table.
function UserAdminPage({ onLogout, setView }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        // IMPORTANT:
        // This assumes you have a 'users' table (or similar) in your Supabase database
        // that stores user information and is accessible via RLS policies.
        // You might need to adjust the table name and selected columns.
        const { data, error } = await supabase
          .from('users') // Assuming a 'profiles' table for user data
          .select('user_id, email, name, user_type'); // Select relevant user columns

        if (error) {
          throw error;
        }

        setUsers(data);
        console.log('Fetched users:', data); // Debugging log

      } catch (error) {
        console.error("Error fetching users:", error.message);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">User Administration</h2>
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

        <h3 className="text-2xl font-semibold text-gray-700 mb-4">All Registered Users</h3>

        {loadingUsers ? (
          <p className="text-gray-600 text-center py-8">Loading users...</p>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">Email</th>
                  <th className="py-3 px-6 text-left">User Type</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 text-sm font-light">
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 text-left whitespace-nowrap">{user.name}</td>
                    <td className="py-3 px-6 text-left">{user.email}</td>
                    <td className="py-3 px-6 text-left">{user.user_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No users found or accessible.</p>
        )}
      </div>
    </div>
  );
}


// --- WelcomePage Component ---
// This component displays existing bookings or an option to book.
function WelcomePage({ session, onLogout, setView }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        // Get today's date in YYYY-MM-DD format for comparison
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const todayFormatted = `${year}-${month}-${day}`;

        // Fetch real data from Supabase
        // IMPORTANT:
        // 1. Double-check your table name ('sessions') in Supabase.
        // 2. Double-check all selected column names ('sessions_id', 'location', 'court', 'date_time', 'created_by')
        //    exactly match your Supabase table schema (case-sensitive).
        // 3. Check your Supabase Row Level Security (RLS) policies for the 'sessions' table.
        //    Ensure the authenticated user has SELECT permissions. For testing, you might temporarily
        //    set a policy that allows 'true' for SELECT, then refine it.
        // 4. If bookings are user-specific, UNCOMMENT the .eq('created_by', session.user.id) line
        //    and ensure your 'sessions' table has a 'created_by' column with the correct user IDs.
        const { data, error } = await supabase
          .from('sessions') // Assuming 'sessions' is your table name
          .select('sessions_id, location, court, date_time, created_by') // Select specific columns as requested
          .eq('created_by', session.user.id) // Filter by logged-in user's ID
          .gte('date_time', todayFormatted) // Filter for bookings from today onwards
          .order('date_time', { ascending: true }); // Order by the actual date_time field

        // --- DEBUGGING LOGS ---
        console.log('Supabase fetch data (filtered for future):', data);
        console.log('Supabase fetch error:', error);
        // --- END DEBUGGING LOGS ---

        if (error) {
          throw error; // Propagate error to catch block
        }

        // Map the fetched data to match the expected structure for display
        // Using 'sessions_id' for the key, 'court' for court_name, and 'date_time' for booking_date
        const formattedBookings = data.map(item => ({
          id: item.sessions_id, // Use sessions_id as the unique key
          court_name: item.court,
          booking_date: item.date_time,
          location: item.location, // Also include location and created_by if needed for display later
          created_by: item.created_by
        }));

        setBookings(formattedBookings);

      } catch (error) {
        console.error("Error fetching bookings:", error.message);
        setBookings([]); // Ensure bookings are empty on error
      } finally {
        setLoadingBookings(false);
      }
    };

    if (session) {
      fetchBookings();
    }
  }, [session]); // Re-fetch if session changes

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

        <h3 className="text-2xl font-semibold text-gray-700 mb-4">Your Court Bookings</h3>

        {loadingBookings ? (
          <p className="text-gray-600 text-center py-8">Loading your bookings...</p>
        ) : (
          bookings.length > 0 ? (
            <div className="space-y-4 mb-6">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm mb-4"> {/* Added mb-4 for spacing */}
                  <p className="font-semibold text-blue-800">{booking.court_name} at {booking.location}</p>
                  {/* Updated to display both date and time */}
                  <p className="text-sm text-gray-600">Date & Time: {new Date(booking.booking_date).toLocaleString()}</p>
                  {/* Display user's full name if available, otherwise email, otherwise ID */}
                  {booking.created_by && (
                    <p className="text-xs text-gray-500">
                      Booked by: {
                        booking.created_by === session.user.id
                          ? (session.user?.user_metadata?.full_name || session.user?.email || session.user?.id)
                          : booking.created_by // Fallback to ID if it's another user's booking
                      }
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg text-gray-600 mb-4">You don't have any court bookings yet.</p>
            </div>
          )
        )}

        {/* This button is now always visible on the WelcomePage */}
        <div className="text-center mt-6 flex justify-center space-x-4"> {/* Added flex and space-x for multiple buttons */}
          <button
            onClick={() => setView('calendar')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Book a New Court
          </button>
          <button
            onClick={() => setView('admin')} // New button for User Administration
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            User Administration
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
          className={`p-2 cursor-pointer rounded-lg text-center font-medium
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
        <div className="grid grid-cols-7 gap-2 text-gray-700 font-semibold text-center mb-4">
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
                      ${selectedCourt === court ? 'bg-green-500 text-white border-green-600 shadow-md' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}
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
                      ${selectedTimeSlot === slot ? 'bg-purple-500 text-white border-purple-600 shadow-md' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}
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
  const [view, setView] = useState('welcome'); // State to manage current view: 'welcome', 'calendar', or 'admin'

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
        {view === 'admin' && <UserAdminPage onLogout={handleLogout} setView={setView} />} {/* New Admin Page */}
      </>
    );
  }
}
