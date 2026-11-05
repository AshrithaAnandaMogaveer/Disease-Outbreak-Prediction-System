import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  MessageSquare, 
  Globe, 
  MessageCircle, 
  LogIn, 
  UserPlus, 
  User,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const menuItems = [
    { path: '/predict', icon: Activity, label: 'Predict Outbreak', requiresAuth: false },
    { path: '/chatbot', icon: MessageSquare, label: 'Chatbot', requiresAuth: true },
    { path: '/whats-happening', icon: Globe, label: "What's Happening Around", requiresAuth: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleMenuClick = (e, item) => {
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      // Show a subtle indication that login is required
      alert('Please login to access this feature');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-screen w-64 bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-primary-700">SDG 3 Platform</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isDisabled = item.requiresAuth && !isAuthenticated;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={(e) => handleMenuClick(e, item)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary-500 text-white shadow-lg'
                          : isDisabled
                          ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                      {isDisabled && (
                        <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded">
                          Login
                        </span>
                      )}
                    </Link>
                  );
                })}

                <div className="pt-4 mt-4 border-t border-gray-200">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/profile"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 ${
                          location.pathname === '/profile'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <User className="w-5 h-5" />
                        <span className="font-medium">Profile</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 ${
                          location.pathname === '/login'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <LogIn className="w-5 h-5" />
                        <span className="font-medium">Login</span>
                      </Link>
                      <Link
                        to="/signup"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          location.pathname === '/signup'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <UserPlus className="w-5 h-5" />
                        <span className="font-medium">Sign Up</span>
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed left-4 top-4 z-50 p-3 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          <ChevronRight className="w-6 h-6 text-primary-600" />
        </motion.button>
      )}
    </>
  );
};

export default Sidebar;
