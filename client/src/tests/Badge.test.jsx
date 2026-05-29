import { render, screen } from '@testing-library/react';
import Badge from '../components/shared/Badge';

describe('Badge', () => {
  it.each([
    ['paid',    'green'],
    ['pending', 'yellow'],
    ['overdue', 'red'],
    ['partial', 'blue'],
    ['present', 'green'],
    ['absent',  'red'],
  ])('renders "%s" with the expected colour token in class', (label, colour) => {
    render(<Badge label={label} />);
    const el = screen.getByText(label);
    expect(el).toBeInTheDocument();
    expect(el.className).toContain(colour);
  });

  it('capitalises the label text via CSS (capitalize class)', () => {
    render(<Badge label="paid" />);
    expect(screen.getByText('paid').className).toContain('capitalize');
  });

  it('falls back gracefully for an unknown variant', () => {
    render(<Badge label="unknown-status" />);
    const el = screen.getByText('unknown-status');
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('gray'); // default fallback
  });
});
