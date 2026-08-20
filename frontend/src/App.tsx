import { Center, Loader } from '@mantine/core';
import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { roleHome } from './lib/roles';
import AcreditadorHome from './pages/acreditador/AcreditadorHome';
import AdminConfiguracion from './pages/admin/AdminConfiguracion';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AlumnoContacto from './pages/alumno/AlumnoContacto';
import AlumnoHome from './pages/alumno/AlumnoHome';
import AlumnoLayout from './pages/alumno/AlumnoLayout';
import AlumnoResultados from './pages/alumno/AlumnoResultados';
import LoginPage from './pages/LoginPage';
import ProfesorGrupo from './pages/profesor/ProfesorGrupo';
import ProfesorHome from './pages/profesor/ProfesorHome';
import ProfesorLayout from './pages/profesor/ProfesorLayout';
import ProfesorResultados from './pages/profesor/ProfesorResultados';
import WelcomePage from './pages/WelcomePage';

function RootIndex() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (user) {
    return <Navigate to={roleHome(user.role.name)} replace />;
  }

  return <WelcomePage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootIndex />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['administrador']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="configuracion" element={<AdminConfiguracion />} />
      </Route>
      <Route
        path="/profesor"
        element={
          <ProtectedRoute roles={['profesor']}>
            <ProfesorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProfesorHome />} />
        <Route path="grupo" element={<ProfesorGrupo />} />
        <Route path="resultados" element={<ProfesorResultados />} />
      </Route>
      <Route
        path="/acreditador"
        element={
          <ProtectedRoute roles={['acreditador']}>
            <AcreditadorHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alumno"
        element={
          <ProtectedRoute roles={['alumno']}>
            <AlumnoLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AlumnoHome />} />
        <Route path="contacto" element={<AlumnoContacto />} />
        <Route path="resultados" element={<AlumnoResultados />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}