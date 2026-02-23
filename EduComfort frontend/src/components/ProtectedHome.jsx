import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';


const ProtectedHome = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    // If user is logged in, redirect to their dashboard
    if (user && user.role) {
      const roleRoutes = {
        'super_admin': '/admin',
        'admin': '/admin',
        'teacher': '/teacher',
        'student': '/student',
        'staff': '/staff',
      };

      const redirectPath = roleRoutes[user.role] || '/login';
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate]);

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // While redirecting, show nothing (or a loader)
  return null;
};

export default ProtectedHome;