import ParticipantRoot from './components/organisms/ParticipantRoot';

// Public participant surface — branches on the `role` in local storage.
// Operators use /admin. See docs/adr/0004-root-is-public-participant-surface.md.
export default function Home() {
  return <ParticipantRoot />;
}
