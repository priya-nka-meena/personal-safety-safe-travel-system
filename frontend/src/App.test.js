import { render, screen } from '@testing-library/react';
import { AuthProvider } from './context/AuthContext';
import App from './App';

jest.mock('./services/api', () => ({
  bootstrapCsrfCookie: jest.fn(() => Promise.resolve()),
  login: jest.fn(),
  logout: jest.fn(),
}));

test('shows login page at root redirect', () => {
  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
  expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument();
});
