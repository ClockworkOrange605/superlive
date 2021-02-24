import React, { useEffect } from "react";
import './App.css';

import iconThrowIn from './svg/throw-in.svg'
import iconFreeKick from './svg/free-kick.svg'
import iconGoalKick from './svg/goal-kick.svg'
import iconCornerKick from './svg/corner-kick.svg'
import iconOffside from './svg/offside.svg'
import iconGoal from './svg/goal.svg'

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
    setMatchItem(null)

    fetch('/api/match/' + selectedItem)
      .then((res) => res.json())
      .then((data) => setMatchItem(data))
  }, [selectedItem])

  return (
    <div className="App">
      <header className="Header">
        {/* <h1>Header</h1> */}
      </header>

      <main className="Content">
        <aside style={{width: '50%', margin: 0}}>
          <MatchList matchList={matchList} selectMatchItem={selectMatchItem}/>
        </aside>
        <aside style={{width: '50%', margin: 0}}>
          <MatchItem matchItem={matchItem} />
        </aside>
      </main>

      <footer className="Footer">
        {/* <h2>Footer</h2> */}
      </footer>
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
            <p>{item.updates ? '+' : '-'}</p>
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
        // setEvents(matchItem.updates.filter(item => item.events != undefined))
        // setStates(matchItem.updates.filter(item => item.state != undefined))

        let currentState = {
          states: [],
          events: {}
        }

        matchItem.updates.forEach(item => {
          if(item.betstop) {
            currentState.betstop = true
            console.log('betting stopped')
          }

          if(item.state) {
            currentState.states.push(item.state)
            // console.log(item.state)
          }

          if(item.events) {
            currentState.events = Object.assign(currentState.events, item.events)
            // console.log(item.events)
          }

          if(item.markets) {
            console.log('markets changed', item.markets)
          }
        })

        setEvents(currentState.events)
        setStates(currentState.states)

        console.log(currentState)
      }
    }
  }, [matchItem])

  return (
    <div className="MatchItem">
      <div>
        <h2>{ !teams ? <Loader /> : `${teams.home.name} ⚽ ${teams.away.name}`}</h2>
        <div className="MatchInfo">

          {events && (
            <div>
              <span>
                <img src={iconThrowIn} />
                <span>{Object.values(events).filter(item => item.type == 'throw-in').length}</span>
              </span>
              <span>
                <img src={iconFreeKick} />
                {Object.values(events).filter(item => item.type == 'free-kick').length}
              </span>
              <span>
                <img src={iconGoalKick} />
                {Object.values(events).filter(item => item.type == 'goal-kick').length}
              </span>
              <span>
                <img src={iconCornerKick} />
                {Object.values(events).filter(item => item.type == 'corner-kick').length}
              </span>
              <span>
                <img src={iconOffside} />
                {Object.values(events).filter(item => item.type == 'offside').length}
              </span>
              <span>
                <img src={iconGoal} />
                {Object.values(events).filter(item => item.type == 'goal').length}
              </span>
            </div>
          )}

          {states && (
            <div>
              {states.map((item, index) => {
                return <div key={index}>
                  {item.type}&nbsp;⏰&nbsp;{!item.server_time ? 'unknown' : new Date(item.server_time).toLocaleString()}
                </div>
              })}
            </div>
          )}

          
          {events && (
            <div className="EventList">
              {Object.values(events).map((item, index) => {
                return <div key={index} className={`${item.type} ${item.side}`}>
                  {`${Math.trunc(item.match_time / 60)}:${(item.match_time % 60).toString().padStart(2, 0)}' `}
                  {!item.additional_time ? '' : `${Math.trunc(item.additional_time / 60)}:${(item.additional_time % 60).toString().padStart(2, 0)}' `}
                  {item.name} [{item.side}] {item.ball_pos ? `(${item.ball_pos.x}, ${item.ball_pos.y})` : '()'}
                </div>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const MatchItemUpdates = function({item}) {
  return (
    item.map((item) => {

    })
  )
}

export default App;