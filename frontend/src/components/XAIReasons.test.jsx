import { render, screen } from '@testing-library/react';
import { XAIReasons } from './XAIReasons';

describe('XAIReasons', () => {
  it('renders nothing when reasons empty', () => {
    const { container } = render(<XAIReasons reasons={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders reason badges', () => {
    render(<XAIReasons reasons={['Proximity match', 'Available now']} />);
    expect(screen.getByText('Proximity match')).toBeInTheDocument();
    expect(screen.getByText('Available now')).toBeInTheDocument();
  });
});
