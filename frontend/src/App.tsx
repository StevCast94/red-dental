import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Treatments from './pages/Treatments';
import TreatmentDetail from './pages/TreatmentDetail';
import Payments from './pages/Payments';
import PatientProfile from './pages/PatientProfile';
// import AdminPage from './pages/AdminPage';
import AdminPanel from './pages/AdminPanel';
import AdminClinics from './pages/AdminClinics';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminCredentials from './pages/AdminCredentials';
import AdminAccess from './pages/AdminAccess';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';

function DefaultRedirect() {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" />;
  return <Navigate to="/dashboard" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/patients" element={<PrivateRoute><Patients /></PrivateRoute>} />
          <Route path="/patients/:id" element={<PrivateRoute><PatientProfile /></PrivateRoute>} />
          <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
          <Route path="/treatments" element={<PrivateRoute><Treatments /></PrivateRoute>} />
          <Route path="/treatments/:id" element={<PrivateRoute><TreatmentDetail /></PrivateRoute>} />
          <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute requireRole="SUPER_ADMIN"><AdminPanel /></PrivateRoute>} />
          <Route path="/admin/clinics" element={<PrivateRoute requireRole="SUPER_ADMIN"><AdminClinics /></PrivateRoute>} />
          <Route path="/admin/subscriptions" element={<PrivateRoute requireRole="SUPER_ADMIN"><AdminSubscriptions /></PrivateRoute>} />
          <Route path="/admin/access" element={<PrivateRoute requireRole="SUPER_ADMIN"><AdminAccess /></PrivateRoute>} />
          <Route path="/admin/credentials" element={<PrivateRoute requireRole="SUPER_ADMIN"><AdminCredentials /></PrivateRoute>} />
          {/* /admin/users removed — clinics manage users themselves */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
