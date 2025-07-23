// WelcomePage.jsx
import { useState, useEffect } from 'react';

function WelcomePage({ session, onLogout, setView, supabase }) {
  const [badmintonBookings, setBadmintonBookings] = useState([]);
  const [tennisBookings, setTennisBookings] = useState([]);
  const [allBookingsForAdmin, setAllBookingsForAdmin] = useState([]); // To store all bookings if admin
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [allUsersMap, setAllUsersMap] = useState({}); // To map user IDs to names
  const [cancelMessage, setCancelMessage] = useState('');
  const [showNameInput, setShowNameInput] = useState(false); // New state for name input visibility
  const [userName, setUserName] = useState(''); // New state for user's name input

  // Check if the current user is an admin
  const isAdmin = session?.user?.user_metadata?.user_type === 'Admin';

  // Fetch all users to create a mapping for display names and check for current user
  useEffect(() => {
    const fetchAllUsersAndCheckCurrentUser = async () => {
      // Only proceed if session and user are available
      if (!session?.user?.id) {
        console.log("Session or user ID not available, skipping user fetch.");
        return;
      }

      // Fetch all users for mapping - now selecting 'user_id' instead of 'id'
      const { data: usersData, error: usersError } = await supabase.from('users').select('user_id, name');

      if (usersError) {
        console.error("Error fetching all users for mapping:", usersError.message);
        return; // Exit if there's an error fetching users
      }

      console.log("Users Data fetched:", usersData); // DEBUG: Log the fetched user data

      if (usersData) {
        const map = {};
        usersData.forEach(user => {
          // Use user.user_id as the key for the map
          map[user.user_id] = user.name || session.user.email; // Fallback to session email if name is null
        });
        setAllUsersMap(map);
        console.log("All Users Map created:", map); // DEBUG: Log the created map

        // Check if current user exists in the 'users' table using user_id
        if (!map[session.user.id]) {
          console.log("Current user not found in 'users' table, prompting for name.");
          setShowNameInput(true); // User not found, prompt for name
        } else {
          // If user found, set their name to the state if available
          setUserName(map[session.user.id]);
          console.log("Current user found in 'users' table. Name:", map[session.user.id]);
        }
      }
    };
    fetchAllUsersAndCheckCurrentUser();
  }, [session, supabase]); // Re-run if session or supabase client changes

  useEffect(() => {
    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        // Only proceed if session and user are available
        if (!session?.user?.id) {
          setLoadingBookings(false);
          return;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const todayFormatted = `${year}-${month}-${day}`;

        let query = supabase
          .from('sessions')
          .select('sessions_id, location, court, date_time, created_by');

        // Removed the restriction to see only their bookings. All bookings will be fetched.
        // if (!isAdmin) {
        //   query = query.eq('created_by', session.user.id);
        // }

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

    // Only fetch bookings if the name input is not shown and session is available
    if (session && !showNameInput) {
      fetchBookings();
    }
  }, [session, isAdmin, showNameInput, supabase]); // Re-fetch if session, admin status, showNameInput, or supabase client changes

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
      // Re-fetch bookings after cancellation
      // Re-call fetchBookings directly to refresh the lists
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const todayFormatted = `${year}-${month}-${day}`;

      let query = supabase
        .from('sessions')
        .select('sessions_id, location, court, date_time, created_by');

      // Removed restriction here as well for consistency
      // if (!isAdmin) {
      //   // Ensure session.user.id is available before querying
      //   if (session?.user?.id) {
      //     query = query.eq('created_by', session.user.id);
      //   } else {
      //     // If user ID is missing, cannot fetch user-specific bookings
      //     setBadmintonBookings([]);
      //     setTennisBookings([]);
      //     setAllBookingsForAdmin([]);
      //     return;
      //   }
      // }

      const { data, error: fetchError } = await query
        .gte('date_time', todayFormatted)
        .order('date_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const badminton = data.filter(item => item.court.toLowerCase().includes('badminton'));
      const tennis = data.filter(item => item.court.toLowerCase().includes('tennis'));

      setBadmintonBookings(badminton);
      setTennisBookings(tennis);
      setAllBookingsForAdmin(data);

    } catch (error) {
      console.error("Error cancelling booking:", error.message);
      setCancelMessage(`Failed to cancel booking: ${error.message}`);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      setCancelMessage('Please enter your name.');
      return;
    }
    // Ensure session and user are available before attempting to save
    if (!session?.user?.id) {
      setCancelMessage('User session not found. Please try logging in again.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .insert([
          // Insert with 'user_id' column
          { user_id: session.user.id, name: userName.trim() }
        ]);

      if (error) {
        throw error;
      }

      // Update the allUsersMap immediately
      setAllUsersMap(prevMap => ({
        ...prevMap,
        [session.user.id]: userName.trim()
      }));
      setShowNameInput(false); // Hide the name input form
      setCancelMessage('Name saved successfully!');
      // Re-fetch bookings now that the user is in the 'users' table
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const todayFormatted = `${year}-${month}-${day}`;

      let query = supabase
        .from('sessions')
        .select('sessions_id, location, court, date_time, created_by');

      // Removed restriction here as well for consistency
      // if (!isAdmin) {
      //   // Ensure session.user.id is available before querying
      //   if (session?.user?.id) {
      //     query = query.eq('created_by', session.user.id);
      //   } else {
      //     setBadmintonBookings([]);
      //     setTennisBookings([]);
      //     setAllBookingsForAdmin([]);
      //     return;
      //   }
      // }

      const { data, error: fetchError } = await query
        .gte('date_time', todayFormatted)
        .order('date_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const badminton = data.filter(item => item.court.toLowerCase().includes('badminton'));
      const tennis = data.filter(item => item.court.toLowerCase().includes('tennis'));

      setBadmintonBookings(badminton);
      setTennisBookings(tennis);
      setAllBookingsForAdmin(data);

    } catch (error) {
      console.error("Error saving user name:", error.message);
      setCancelMessage(`Failed to save name: ${error.message}`);
    }
  };

  if (showNameInput) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Welcome! Please tell us your name.
          </h2>
          {cancelMessage && (
            <div className={`p-3 mb-4 rounded-lg text-center font-semibold ${cancelMessage.startsWith('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {cancelMessage}
            </div>
          )}
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Your Name</label>
              <input
                type="text"
                id="userName"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g., John Doe"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Save Name
            </button>
          </form>
          <div className="text-center mt-6">
            <button
              onClick={onLogout}
              className="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl"> {/* Increased max-w for more space */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 sm:mb-0"> {/* Larger, bolder welcome text */}
            Welcome, {allUsersMap[session?.user?.id] || session?.user?.email || 'User'}!
          </h1>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Logout
          </button>
        </div>

        <p className="text-lg text-gray-700 text-center mb-8">
          Manage your court bookings and join upcoming sessions with ease.
        </p>

        {/* Booking Sections Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8"> {/* Grid layout for booking types */}
          {/* Badminton Bookings Section */}
          <div className="bg-blue-50 p-6 rounded-xl shadow-md border border-blue-200"> {/* Rounded corners, shadow */}
            <h4 className="text-2xl font-bold text-blue-800 mb-4">Badminton Bookings</h4>
            {loadingBookings ? (
              <p className="text-gray-600 text-center py-4">Loading bookings...</p>
            ) : badmintonBookings.length > 0 ? (
              <div className="space-y-4">
                {badmintonBookings.map((booking) => (
                  <div key={booking.sessions_id} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                    <p className="font-semibold text-blue-700">{booking.court} at {booking.location}</p>
                    <p className="text-sm text-gray-600">Date & Time: {new Date(booking.date_time).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                        Booked by: <span className="font-semibold">
                          {allUsersMap[booking.created_by] || booking.created_by}
                        </span>
                      </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No upcoming badminton bookings.</p>
            )}
          </div>

          {/* Tennis Bookings Section */}
          <div className="bg-green-50 p-6 rounded-xl shadow-md border border-green-200"> {/* Rounded corners, shadow */}
            <h4 className="text-2xl font-bold text-green-800 mb-4">Tennis Bookings</h4>
            {loadingBookings ? (
              <p className="text-gray-600 text-center py-4">Loading bookings...</p>
            ) : tennisBookings.length > 0 ? (
              <div className="space-y-4">
                {tennisBookings.map((booking) => (
                  <div key={booking.sessions_id} className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                    <p className="font-semibold text-green-700">{booking.court} at {booking.location}</p>
                    <p className="text-sm text-gray-600">Date & Time: {new Date(booking.date_time).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                        Booked by: <span className="font-semibold">
                          {allUsersMap[booking.created_by] || booking.created_by}
                        </span>
                      </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No upcoming tennis bookings.</p>
            )}
          </div>
        </div>

        {/* All Registered Users Section - NEW */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">All Registered Users</h3>
          {Object.keys(allUsersMap).length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(allUsersMap).map(([id, name]) => (
                <li key={id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm text-gray-700 font-medium">
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 text-center py-4">No registered users found.</p>
          )}
        </div>

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
        <div className="text-center mt-8 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => setView('calendar')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Book a New Court
          </button>
          <button
            onClick={() => setView('userBookings')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            View All Bookings
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;
