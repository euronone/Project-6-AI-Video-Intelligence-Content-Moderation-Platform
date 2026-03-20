/**
 * F-02 — Dashboard Layout: Sidebar & Header component tests
 */
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'u1', email: 'admin@vidshield.ai', name: 'Admin User', role: 'admin' },
    isAuthenticated: true,
    isAdmin: true,
    logout: jest.fn(),
  })),
}));

describe('Sidebar (F-02)', () => {
  it('renders Dashboard navigation link', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders Videos navigation link', () => {
    render(<Sidebar />);
    expect(screen.getByText('Videos')).toBeInTheDocument();
  });

  it('renders Moderation Queue navigation link', () => {
    render(<Sidebar />);
    expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
  });

  it('renders the VidShield brand text', () => {
    render(<Sidebar />);
    expect(screen.getByText(/vidshield/i)).toBeInTheDocument();
  });

  it('renders Live Streams link', () => {
    render(<Sidebar />);
    expect(screen.getByText('Live Streams')).toBeInTheDocument();
  });
});

describe('Header (F-02)', () => {
  it('renders a header HTML element', () => {
    const { container } = render(<Header />);
    expect(container.querySelector('header')).toBeInTheDocument();
  });

  it('renders user avatar with initials AU for "Admin User"', () => {
    render(<Header />);
    expect(screen.getByText('AU')).toBeInTheDocument();
  });

  it('renders the Alerts bell button', () => {
    render(<Header />);
    expect(screen.getByLabelText('Alerts')).toBeInTheDocument();
  });

  it('renders User menu button', () => {
    render(<Header />);
    expect(screen.getByLabelText('User menu')).toBeInTheDocument();
  });
});
