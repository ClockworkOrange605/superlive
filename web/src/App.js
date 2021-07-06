import { BrowserRouter as Router, Link, Route } from 'react-router-dom'

import './App.css';
import logo from './logo.png';

import Dashboard from './Components/Dashboard.js'
import Matches from './Components/Matches.js'

function App() {
  return (
    <div className="App">
      <Router>
        <header className="Header">
        <img className="Logo" src={logo} />
          <nav>
            <Link to="/">Dashboard</Link>
            <Link to="/matches/">Matches</Link>
            <Link to="/betting/">Betting</Link>
          </nav>
        </header>

        <Route exact path="/" component={Dashboard} />
        <Route path="/matches/" component={Matches} />
        <Route path="/betting/">
          <div className="Betting" />
        </Route>

        <footer className="Footer" />
      </Router>
    </div>
  )
}

export default App;