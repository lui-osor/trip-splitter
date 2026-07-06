import { PhoneFrame } from './components/PhoneFrame'
import { useAuth } from './hooks/useAuth'
import { HomeScreen } from './screens/HomeScreen'
import { LoginScreen } from './screens/LoginScreen'

export default function App() {
  const { session, profile, loading, refreshProfile } = useAuth()

  return (
    <PhoneFrame>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[var(--color-fg-3)] text-[14px]">Loading…</div>
        </div>
      ) : !session ? (
        <LoginScreen />
      ) : (
        <HomeScreen
          userId={session.user.id}
          profile={profile}
          email={session.user.email ?? ''}
          refreshProfile={refreshProfile}
        />
      )}
    </PhoneFrame>
  )
}
