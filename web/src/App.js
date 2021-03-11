import React, { useRef, useEffect } from "react";
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
            key={item.id} className={`MatchLink ${item.state}`}
            onClick={() => selectMatchItem(item.id)}
          >
            <p>
              <span className="MatchTitle">
                ⚽&nbsp;
                {item.teams.home.name}
                &nbsp;—&nbsp;
                {item.teams.away.name}
              </span>
              <span className="MatchTime">
                ⌚
                {
                  new Intl.DateTimeFormat('ru-RU', {dateStyle: 'short',timeStyle: 'short'})
                    .format(new Date(item.start))
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
  const [events, setEvents] = React.useState(null)

  useEffect(() => {
    setEvents(null)

    if(matchItem) {
      if(matchItem.updates) {

        let currentState = {
          states: [],
          events: {}
        }

        matchItem.updates.forEach(item => {
          if(item.betstop) {
            currentState.betstop = true
            // console.log('betting stopped')
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
            // console.log('markets changed', item.markets)
          }
        })

        setEvents(currentState.events)
      }
    }
  }, [matchItem])

  return (
    <div className="MatchItem">
      <div>
        <h2>
          { !matchItem ? 
            <Loader /> : 
            `${matchItem.teams.home.name} ⚽ ${matchItem.teams.away.name}`
          }
        </h2>
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

          {matchItem && matchItem.periods && (
            <div>
              {matchItem.periods.map((item, index) => {
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
                  {item.name} 
                  {/*}
                  [{item.side}] {item.ball_pos ? `(${item.ball_pos.x}, ${item.ball_pos.y})` : '()'}
                  */}
                </div>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App;