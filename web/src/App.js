import React, { useEffect } from "react";
import './App.css';

const Loader = function() {
  return <div className="Loader">⚽</div>
}

function App() {
  const [matchList, setMatchList] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/match/')
      .then((res) => res.json())
      .then((data) => setMatchList(data))
  }, [])

  const [selectedItem, selectMatchItem] = React.useState(null)
  const [matchItem, setMatchItem] = React.useState(null)

  React.useEffect(() => {
    fetch('/api/match/' + selectedItem)
      .then((res) => res.json())
      .then((data) => setMatchItem(data))
  }, [selectedItem])

  return (
    <div className="App">
      <header></header>

      <main>
        <aside style={{width: '45%', margin: 0, float: 'left'}}>
          <MatchList matchList={matchList} selectMatchItem={selectMatchItem}/>
        </aside>
        <aside style={{width: '45%', margin: 0, float: 'right'}}>
          <MatchItem matchItem={matchItem} />
        </aside>
      </main>

      <footer></footer>
    </div>
  );
}

const MatchList = function ({matchList, selectMatchItem}) {
  return (
    <div className="MatchList">
      <ul>
        {!matchList ? <Loader /> : matchList.map((item, index) => {
          return <li 
            key={item.id} className="MatchLink"
            onClick={() => selectMatchItem(item.id)}
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

const MatchItem = function ({matchItem}) {
  const [teams, setTeams] = React.useState(null)
  const [states, setStates] = React.useState(null)
  const [events, setEvents] = React.useState(null)

  useEffect(() => {
    setStates(null)
    setTeams(null)
    setEvents(null)

    if(matchItem) {
      setTeams({
        home: Object.values(matchItem.teams).find(item => item.side == 'home'),
        away: Object.values(matchItem.teams).find(item => item.side == 'away')
      })

      if(matchItem.updates) {
        setEvents(matchItem.updates.filter(item => item.events != undefined))
        setStates(matchItem.updates.filter(item => item.state != undefined))
      }

      console.log(matchItem)
    }
  }, [matchItem])

  return (
    <div className="MatchItem">
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