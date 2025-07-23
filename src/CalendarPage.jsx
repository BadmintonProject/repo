// CalendarPage.jsx
import { useState } from 'react';

function CalendarPage({ session, onLogout, setView, supabase }) {
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
      const fullDateTime = `${datePart}T${timePart}:00`;

      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDateDisplay = selectedDate.toLocaleDateString(undefined, options);

      try {
        const { data, error } = await supabase
          .from('sessions') // Assuming 'sessions' is your table name
          .insert([
            {
              created_by: session.user.id,
              court: selectedCourt,
              date_time: fullDateTime,
              location: 'Wanstead Leisure Centre', // Example: You might want to add a location selection
              status: 'Booked',
              players_attending: [session.user.id] // IMPORTANT: Add creator to players_attending
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

export default CalendarPage;
