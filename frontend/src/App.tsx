import { Center, Loader } from '@mantine/core';
import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { roleHome } from './lib/roles';
import AcreditadorHome from './pages/acreditador/AcreditadorHome';
import AcreditadorLayout from './pages/acreditador/AcreditadorLayout';
import AdminConfiguracion from './pages/admin/AdminConfiguracion';
import AdminCargaAlumnos from './pages/admin/AdminCargaAlumnos';
import AdminCargaWebAssign from './pages/admin/AdminCargaWebAssign';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReportes from './pages/admin/AdminReportes';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLigasExamenes from './pages/admin/AdminLigasExamenes';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AlumnoContacto from './pages/alumno/AlumnoContacto';
import AlumnoHome from './pages/alumno/AlumnoHome';
import AlumnoLayout from './pages/alumno/AlumnoLayout';
import AlumnoLigasExamenes from './pages/alumno/AlumnoLigasExamenes';
import AlumnoResultados from './pages/alumno/AlumnoResultados';
import LoginPage from './pages/LoginPage';
import RegistroAlumnoPage from './pages/RegistroAlumnoPage';
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
      <Route path="/registro" element={<RegistroAlumnoPage />} />
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
        <Route path="carga" element={<AdminCargaAlumnos />} />
        <Route path="webassign" element={<AdminCargaWebAssign />} />
        <Route path="reportes" element={<AdminReportes />} />
        <Route path="configuracion" element={<AdminConfiguracion />} />
        <Route path="usuarios" element={<AdminUsuarios />} />
        <Route path="ligas" element={<AdminLigasExamenes />} />
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
            <AcreditadorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AcreditadorHome />} />
      </Route>
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
        <Route path="ligas" element={<AlumnoLigasExamenes />} />
        <Route path="resultados" element={<AlumnoResultados />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}