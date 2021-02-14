import React, { useEffect } from "react";
import logo from './logo.svg';
import './App.css';

function App() {
  const [data, setData] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setData(data.status))
  }, [])

  return (
    <div className="App">
      <MatchList />
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          {!data ? 'Loading...' : data}
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

const MatchList = function () {
  const [data, setData] = React.useState(null)
  const [selectedMatch, selectMatch] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/match/')
      .then((res) => res.json())
      .then((data) => setData(data))
  }, [])

  useEffect(() => {
    console.log(`select ${selectedMatch}`)
  }, [selectedMatch])

  return (
    <div className="matchList">
      <MatchItem id={selectedMatch} />
      <h1>Match List</h1>
      <ul>
        {!data ? 'Loading...' : data.map((item, index) => {
          return <li 
            key={item.id} 
            onClick={() => selectMatch(item.id)}
          >
            ⌚{new Date(item.start_time).toLocaleString()}&nbsp;
            🌍{item.region_name}&nbsp;
            🏆{item.competition_name}&nbsp;
            ⚽
            {Object.values(item.teams).find(item => item.side == 'home').name}&nbsp;—&nbsp;
            {Object.values(item.teams).find(item => item.side == 'away').name}
          </li>
        })}
      </ul>
      <p>{selectedMatch}</p>
    </div>    
  )
}

const MatchItem = function ({id}) {
  const [data, setData] = React.useState(null)

  React.useEffect(() => {
    setData(null)

    fetch('/api/match/' + id)
      .then((res) => res.json())
      .then((data) => setData(data))
  }, [id])

  const [teams, setTeams] = React.useState(null)
  const [states, setStates] = React.useState(null)
  const [events, setEvents] = React.useState(null)

  useEffect(() => {
    setStates(null)
    setTeams(null)
    setEvents(null)

    if(data) {
      setTeams({
        home: Object.values(data.teams).find(item => item.side == 'home'),
        away: Object.values(data.teams).find(item => item.side == 'away')
      })

      if(data.updates) {
        setEvents(data.updates.filter(item => item.events != undefined))
        setStates(data.updates.filter(item => item.state != undefined))
      }

      console.log(data)
    }
  }, [data])

  return (
    <div className="matchItem">
      <h1>Match Item</h1>
      <div>
        <div>
          <h2>{ !teams ? 'Select Match' : `${teams.home.name} ⚽ ${teams.away.name}`}</h2>
        </div>
        <div>
          { !states ? '' : states.map((item, index) => {
            return <div key={index}>
              {item.state.type} 
              ⏰{!item.state.server_time ? 'unknown' : new Date(item.state.server_time).toLocaleString()}
            </div>
          })}

          {!events ? '' : events.map((item, index) => {
            return <div key={index}>
              {Object.values(item.events).map((item, index) => {
                return <p key={index} className={item.type}>
                  {Math.trunc(item.match_time / 60)}:{(item.match_time % 60).toString().padStart(2, 0)}'
                  {item.name} [{item.side}]
                </p>
              })}
            </div>
          })}
        </div>
      </div>
    </div>
  )
}

export default App;
