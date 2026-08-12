import { Anchor, Divider, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconBuildingBank } from '@tabler/icons-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import LoginForm, { type LoginMode } from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import { roleHome } from '../lib/roles';
import classes from './LoginPage.module.css';

function loginModeFromParams(value: string | null): LoginMode {
  if (value === 'alumno') return 'alumno';
  return 'profesor';
}

type TitleConfig = {
  title: string;
  subtitle: string;
};

function titleConfigFromParams(value: string | null): TitleConfig {
  if (value === 'alumno') {
    return {
      title: 'Acceso de alumnos',
      subtitle: 'Ingresa con tu número de cuenta',
    };
  }
  if (value === 'institucional') {
    return {
      title: 'Acceso institucional',
      subtitle: 'Ingresa con tu cuenta institucional',
    };
  }
  return {
    title: 'Acceso de profesor',
    subtitle: 'Ingresa con tu correo institucional y contraseña',
  };
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawModo = searchParams.get('modo') ?? searchParams.get('role');
  const mode: LoginMode = loginModeFromParams(rawModo);
  const config = titleConfigFromParams(rawModo);

  if (!loading && user) {
    return <Navigate to={roleHome(user.role.name)} replace />;
  }

  return (
    <div className={classes.page}>
      <div className={classes.wrapper}>
        <IconBuildingBank
          size={44}
          stroke={1.5}
          className={classes.icon}
          aria-hidden="true"
        />

        <Title order={1} className={classes.title}>
          {config.title}
        </Title>
        <Text className={classes.subtitle}>{config.subtitle}</Text>

        <LoginForm key={rawModo ?? 'profesor'} mode={mode} />

        <Divider className={classes.divider} />
        <div className={classes.backRow}>
          <Anchor
            component="button"
            type="button"
            className={classes.back}
            onClick={() => navigate('/')}
          >
            <IconArrowLeft size={18} aria-hidden="true" />
            Volver
          </Anchor>
        </div>
      </div>
    </div>
  );
}