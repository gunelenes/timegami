import { WelcomeGate } from '@/features/legal/welcome-gate';

/** First launch only (see the guard in _layout). */
export default function WelcomeScreen() {
  return <WelcomeGate />;
}
