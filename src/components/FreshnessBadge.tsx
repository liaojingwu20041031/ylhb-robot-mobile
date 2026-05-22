import { freshnessLabel, freshnessTone } from '../utils/status';
import { StatusBadge } from './StatusBadge';

type Props = {
  age?: number;
};

export function FreshnessBadge({ age }: Props) {
  return <StatusBadge label={freshnessLabel(age)} tone={freshnessTone(age)} />;
}
