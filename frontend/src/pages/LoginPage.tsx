import { Anchor, Divider, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconBuildingBank } from '@tabler/icons-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import { roleHome, type Portal } from '../lib/roles';
import classes from './LoginPage.module.css';

function portalFromParams(value: string | null): Portal {
  if (value === 'alumno' || value === 'institucional') return value;
  return 'profesor';
}

type TitleConfig = {
  title: string;
  subtitle: string;
};

const TITULOS: Record<Portal, TitleConfig> = {
  alumno: {
    title: 'Acceso de alumnos',
    subtitle: 'Ingresa con tu número de cuenta',
  },
  institucional: {
    title: 'Acceso institucional',
    subtitle: 'Ingresa con tu cuenta institucional',
  },
  profesor: {
    title: 'Acceso de profesor',
    subtitle: 'Ingresa con tu correo institucional y contraseña',
  },
};

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawModo = searchParams.get('modo') ?? searchParams.get('role');
  const portal = portalFromParams(rawModo);
  const config = TITULOS[portal];

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

        <LoginForm key={portal} portal={portal} />

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