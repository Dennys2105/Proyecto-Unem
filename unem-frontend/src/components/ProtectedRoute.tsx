import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = () => {
  const token = sessionStorage.getItem('unem_token');
  const blockData = sessionStorage.getItem('unem_auth_block');
  
  if (blockData) {
    const { isBlocked, unblockTime } = JSON.parse(blockData);
    if (isBlocked && unblockTime && Date.now() < unblockTime) {
      return <Navigate to="/login" replace />;
    } else if (isBlocked && unblockTime && Date.now() >= unblockTime) {
      sessionStorage.removeItem('unem_auth_block');
    }
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};