import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  Upload, 
  AlertTriangle, 
  Shield, 
  User,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminSidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userData, token } = useAuth();
  const [pendingReports, setPendingReports] = useState(0);

  // Fetch pending reports count
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!token) return;
      try {
        const response = await fetch('http://localhost:8000/api/admin/outbreak-reports?status=pending', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const reports = await response.json();
          setPendingReports(reports.length);
        }
      } catch (error) {
        console.error('Failed to fetch pending reports:', error);
      }
    };

    fetchPendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const menuItems = [
    { path: '/admin-dashboard?tab=add', icon: Upload, label: 'Add New Cases' },
    { path: '/admin-dashboard?tab=reports', icon: Shield, label: 'Hallucination Detection' },
    { path: '/admin-dashboard/warnings', icon: AlertTriangle, label: 'Sending Warning & Requests' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {isOpen && (
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 h-screen w-64 bg-white shadow-2xl z-50 overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-primary-700">Admin Panel</h2>
                <p className="text-xs text-gray-500 mt-1">SDG 3 Platform</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Info */}
            <div className="mb-6 p-4 bg-primary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{userData?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-600">Administrator</p>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname + location.search === item.path;
                const isHallucinationTab = item.label === 'Hallucination Detection';
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary-500 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    {isHallucinationTab && pendingReports > 0 && (
                      <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                        isActive 
                          ? 'bg-white text-primary-600' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {pendingReports}
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-gray-200">
                <Link
                  to="/admin-dashboard/profile"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-2 ${
                    location.pathname === '/admin-dashboard/profile'
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
              </div>
            </nav>
          </div>
        </motion.aside>
      )}

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

export default AdminSidebar;
