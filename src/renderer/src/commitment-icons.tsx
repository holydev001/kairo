import { Sparkles } from 'lucide-react'
import { commitmentIcons } from './commitment-icon-library'

export function CommitmentIcon({
  name,
  size = 18
}: {
  name: string
  size?: number
}): React.JSX.Element {
  const Icon = commitmentIcons[name] ?? Sparkles
  return <Icon size={size} />
}
