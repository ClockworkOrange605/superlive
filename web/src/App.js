import { BrowserRouter as Router, Link, Route } from 'react-router-dom'

import './App.css';

import Dashboard from './Components/Dashboard.js'
import Matches from './Components/Matches.js'

function App() {
  return (
    <div className="App">
      <Router>
        <header className="Header">        
            <Link to="/">Dashboard</Link>
            <Link to="/matches/">Matches</Link>
        </header>
        
        <Route exact path="/" component={Dashboard} />
        <Route path="/matches/" component={Matches} />

        <footer className="Footer" />
      </Router>      
    </div>
  )
}

export default App;