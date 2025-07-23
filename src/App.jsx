// App.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// Import your page components
import WelcomePage from './WelcomePage.jsx';
import CalendarPage from './CalendarPage.jsx';
import UserBookingsPage from './UserBookingsPage.jsx';

// Your Supabase project URL and anon key
// For production, it's highly recommended to use environment variables
// (e.g., process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY)
// instead of hardcoding them directly here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Using environment variable
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // Using environment variable

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
            // Add this prop to capture the user's name on sign-up
            magicLink={{
              variables: {
                default: {
                  data: {
                    name: '' // This will add a 'name' field to the sign-up form
                  }
                }
              }
            }}
          />
        </div>
      </div>
    );
  } else {
    // If session exists, show the appropriate page based on 'view' state
    return (
      <>
        {view === 'welcome' && <WelcomePage session={session} onLogout={handleLogout} setView={setView} supabase={supabase} />}
        {view === 'calendar' && <CalendarPage session={session} onLogout={handleLogout} setView={setView} supabase={supabase} />}
        {view === 'userBookings' && <UserBookingsPage session={session} onLogout={handleLogout} setView={setView} supabase={supabase} />}
      </>
    );
  }
}
