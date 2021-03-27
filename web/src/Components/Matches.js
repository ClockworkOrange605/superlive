import { useState, useEffect } from 'react'

import iconThrowIn from '../svg/throw-in.svg'
import iconFreeKick from '../svg/free-kick.svg'
import iconGoalKick from '../svg/goal-kick.svg'
import iconCornerKick from '../svg/corner-kick.svg'
import iconOffside from '../svg/offside.svg'
import iconGoal from '../svg/goal.svg'

const Loader = () => <div className="Loader">⚽</div>

const Matches = () => {
  const [matchList, setMatchList] = useState(null)
  
  useEffect(() => {
    fetch('/api/match/')
      .then((res) => res.json())
      .then((data) => setMatchList(data))
  }, [])
  
  const [selectedItem, selectMatchItem] = useState(null)
  const [matchItem, setMatchItem] = useState(null)
  
  useEffect(() => {
    setMatchItem(null)
  
    fetch('/api/match/' + selectedItem)
      .then((res) => res.json())
      .then((data) => setMatchItem(data))
  }, [selectedItem])
  
  return (
    <main className="Content">
      <aside style={{width: '50%', margin: 0}}>
        <MatchList matchList={matchList} selectMatchItem={selectMatchItem}/>
      </aside>
      <aside style={{width: '50%', margin: 0}}>
        <MatchItem matchItem={matchItem} />
      </aside>
    </main>
  )
}

const MatchList = ({matchList, selectMatchItem}) => {
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
            <hr />
            { item.events !== undefined ? (
              <p>
                <span>
                  {(item.events.filter(item => item.type == 'throw-in').length / item.events.length * 100).toFixed(2)}%
                  <img src={iconThrowIn} />
                  {item.events.filter(item => item.type == 'throw-in').length}
                </span>
                <span>
                  <img src={iconFreeKick} />
                  {item.events.filter(item => item.type == 'free-kick').length}
                </span>
                <span>
                  <img src={iconGoalKick} />
                  {item.events.filter(item => item.type == 'goal-kick').length}
                </span>
                <span>
                  <img src={iconCornerKick} />
                  {item.events.filter(item => item.type == 'corner-kick').length}
                </span>
                <span>
                  <img src={iconOffside} />
                  {item.events.filter(item => item.type == 'offside').length}
                </span>
                <span>
                  <img src={iconGoal} />
                  {item.events.filter(item => item.type == 'goal').length}
                </span>
              </p>
            ) : <p></p> }
          </li>
        })}
      </ul>
    </div>    
  )
}

const MatchItem = ({matchItem}) => {
  return (
    <div className="MatchItem">
      <div>
        <h2>
          { !matchItem ? <Loader /> : 
            `${matchItem.teams.home.name} ⚽ ${matchItem.teams.away.name}`
          }
        </h2>
        <div className="MatchInfo">
          {matchItem && matchItem.events && (
            <div>
              <span>
                <img src={iconThrowIn} />
                <span>{Object.values(matchItem.events).filter(item => item.type == 'throw-in').length}</span>
              </span>
              <span>
                <img src={iconFreeKick} />
                {Object.values(matchItem.events).filter(item => item.type == 'free-kick').length}
              </span>
              <span>
                <img src={iconGoalKick} />
                {Object.values(matchItem.events).filter(item => item.type == 'goal-kick').length}
              </span>
              <span>
                <img src={iconCornerKick} />
                {Object.values(matchItem.events).filter(item => item.type == 'corner-kick').length}
              </span>
              <span>
                <img src={iconOffside} />
                {Object.values(matchItem.events).filter(item => item.type == 'offside').length}
              </span>
              <span>
                <img src={iconGoal} />
                {Object.values(matchItem.events).filter(item => item.type == 'goal').length}
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

          {matchItem && matchItem.events && (
            <div className="EventList">
              {Object.values(matchItem.events).map((item, index) => {
                return <div key={index} className={`${item.type} ${item.side}`}>
                  {`${Math.trunc(item.match_time / 60)}:${(item.match_time % 60).toString().padStart(2, 0)}' `}
                  {!item.additional_time ? '' : `${Math.trunc(item.additional_time / 60)}:${(item.additional_time % 60).toString().padStart(2, 0)}' `}
                  {item.name} 
                </div>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Matches