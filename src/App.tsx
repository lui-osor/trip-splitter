import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { TripSetup } from './pages/TripSetup'
import { TripView } from './pages/TripView'

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/trip/:tripId/setup" element={<TripSetup />} />
          <Route path="/trip/:tripId" element={<TripView />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
