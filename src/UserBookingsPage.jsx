// UserBookingsPage.jsx
import { useState, useEffect } from 'react';

function UserBookingsPage({ session, onLogout, setView, supabase }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingMessage, setBookingMessage] = useState('');
  const [allUsersMap, setAllUsersMap] = useState({}); // To map user IDs to names

  const currentUserId = session?.user?.id;

  // Fetch all users to create a mapping for display names
  useEffect(() => {
    const fetchAllUsers = async () => {
      // Fetch all users for mapping - now selecting 'user_id' instead of 'id'
      const { data: usersData, error: usersError } = await supabase.from('users').select('user_id, name');
      if (usersData) {
        const map = {};
        usersData.forEach(user => {
          // Use user.user_id as the key for the map
          map[user.user_id] = user.name || user.email; // Fallback to email if name is null
        });
        setAllUsersMap(map);
      }
      if (usersError) console.error("Error fetching all users for mapping:", usersError.message);
    };
    fetchAllUsers();
  }, [supabase]); // Run once on mount, or if supabase client changes

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
  }, [currentUserId, supabase]); // Re-fetch bookings if current user or supabase client changes

  const handleJoinLeaveBooking = async (bookingId, currentPlayers, action) => {
    setBookingMessage('');
    try {
      // Use a Set to easily manage unique players and convert back to array for Supabase
      const safeCurrentPlayers = new Set(currentPlayers || []);
      let newPlayersAttendingArray;

      if (action === 'join') {
        safeCurrentPlayers.add(currentUserId); // Add the current user
      } else { // action === 'leave'
        safeCurrentPlayers.delete(currentUserId); // Remove the current user
      }

      newPlayersAttendingArray = Array.from(safeCurrentPlayers); // Convert Set back to Array

      console.log('Attempting to update players_attending to:', newPlayersAttendingArray);

      const { data: updateData, error: updateError } = await supabase
        .from('sessions')
        .update({ players_attending: newPlayersAttendingArray })
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
              // The definitive list of attending players is now just players_attending
              const currentAttendingPlayers = booking.players_attending || [];
              const attendingNames = currentAttendingPlayers
                .map(id => allUsersMap[id] || id) // Map IDs to names
                .join(', ');

              // Check if the current user is in the players_attending array
              const isAttending = currentAttendingPlayers.includes(currentUserId);

              return (
                <div key={booking.sessions_id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <p className="text-xl font-bold text-blue-700 mb-2">{booking.court}</p>
                  <p className="text-md text-gray-700">Location: {booking.location}</p>
                  <p className="text-md text-gray-700">Date & Time: {new Date(booking.date_time).toLocaleString()}</p>

                  {/* Display all attending players' names based on players_attending */}
                  {currentAttendingPlayers.length > 0 && (
                    <p className="text-sm text-gray-600 mb-4">
                      Attending: <span className="font-semibold">{attendingNames}</span>
                    </p>
                  )}
                  {currentAttendingPlayers.length === 0 && (
                    <p className="text-sm text-gray-600 mb-4">
                      No one is currently attending this session.
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

export default UserBookingsPage;
