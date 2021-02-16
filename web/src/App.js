import React, { useEffect } from "react";
import './App.css';

const Loader = function() {
  return <div className="Loader">⚽</div>
}

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
    <div className="MatchList">
      <MatchItem id={selectedMatch} />
      <h1>Match List</h1>
      <ul>
        {!data ? <Loader /> : data.map((item, index) => {
          return <li 
            key={item.id} className="MatchLink"
            onClick={() => selectMatch(item.id)}
          >
            <p>
              <span className="MatchTitle">
                ⚽&nbsp;
                {Object.values(item.teams).find(item => item.side == 'home').name}
                &nbsp;—&nbsp;
                {Object.values(item.teams).find(item => item.side == 'away').name}
              </span>
              <span className="MatchTime">
                ⌚
                {
                  new Intl.DateTimeFormat('ru-RU', {dateStyle: 'short',timeStyle: 'short'})
                    .format(new Date(item.start_time))
                }
              </span>
            </p>
            <hr />
            <p>
              <span className="MatchLegion">🏆&nbsp;{item.competition_name}</span>
              <span className="MatchRegion">🌍&nbsp;{item.region_name}</span>
            </p>
          </li>
        })}
      </ul>
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
    <div className="MatchItem">
      <h1>Match Item</h1>
      <div>
        <h2>{ !teams ? <Loader /> : `${teams.home.name} ⚽ ${teams.away.name}`}</h2>
        <div className="MatchInfo">
          { !states ? '' : states.map((item, index) => {
            return <div key={index}>
              {item.state.type} 
              ⏰{!item.state.server_time ? 'unknown' : new Date(item.state.server_time).toLocaleString()}
            </div>
          })}

          {!events ? '' : events.map((item, index) => {
            return <div key={index}>
              {
                Object.values(item.events)
                  .sort((e1, e2) => { return e1.match_time > e2.match_time })
                  .map((item, index) => {
                    return <p key={index} className={item.type}>
                      {`${Math.trunc(item.match_time / 60)}:${(item.match_time % 60).toString().padStart(2, 0)}' `}
                      {!item.additional_time ? '' : `${Math.trunc(item.additional_time / 60)}:${(item.additional_time % 60).toString().padStart(2, 0)}' `}
                      {item.name} [{item.side}] {item.ball_pos ? `${item.ball_pos.x}, ${item.ball_pos.y}` : '()'}
                    </p>
                  })
              }
            </div>
          })}
        </div>
      </div>
    </div>
  )
}

export default App;
