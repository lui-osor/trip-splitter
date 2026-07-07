import { PhoneFrame } from './components/PhoneFrame'
import { useAuth } from './hooks/useAuth'
import { HomeScreen } from './screens/HomeScreen'
import { LoginScreen } from './screens/LoginScreen'
import { NewPasswordScreen } from './screens/NewPasswordScreen'

export default function App() {
  const {
    session,
    profile,
    loading,
    isPasswordRecovery,
    refreshProfile,
    clearPasswordRecovery,
  } = useAuth()

  return (
    <PhoneFrame>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[var(--color-fg-3)] text-[14px]">Loading…</div>
        </div>
      ) : isPasswordRecovery ? (
        <NewPasswordScreen
          email={session?.user.email ?? ''}
          onDone={clearPasswordRecovery}
        />
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
