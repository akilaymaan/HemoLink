import { render, screen } from '@testing-library/react';
import { EligibilityGauge } from './EligibilityGauge';

describe('EligibilityGauge', () => {
  it('renders score and verdict', () => {
    render(<EligibilityGauge score={85} verdict="Safe to Request" />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Safe to Request')).toBeInTheDocument();
  });

  it('shows ML suitability score label', () => {
    render(<EligibilityGauge score={50} />);
    expect(screen.getByText('ML suitability score')).toBeInTheDocument();
  });
});
