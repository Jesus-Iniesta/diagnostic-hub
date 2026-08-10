import {
  API_BASE_URL,
  AUTH_ME_URL,
  AUTH_NUMERO_CUENTA_URL,
  AUTH_TOKEN_URL,
  HEALTH_URL,
} from './config';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <h1>TutoNet</h1>
      <p>Frontend en construcción. API base: {API_BASE_URL}</p>
      <p>URL de health: {HEALTH_URL}</p>
      <p>URL de autenticación por token: {AUTH_TOKEN_URL}</p>
      <p>URL de autenticación por número de cuenta: {AUTH_NUMERO_CUENTA_URL}</p>
      <p>URL de información del usuario: {AUTH_ME_URL}</p>
    </div>
  );
}
