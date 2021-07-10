import { useState, useEffect, useRef } from 'react'

import iconThrowIn from '../svg/throw-in.svg'
import iconFreeKick from '../svg/free-kick.svg'
import iconGoalKick from '../svg/goal-kick.svg'
import iconCornerKick from '../svg/corner-kick.svg'
import iconOffside from '../svg/offside.svg'
import iconGoal from '../svg/goal.svg'

import * as echarts from 'echarts';

const Loader = () => <div className="Loader">⚽</div>

const EventCounts = ({events}) => <p>
  <span>
    {(events.filter(item => item.type == 'throw-in').length / events.length * 100).toFixed(2)}%
    <img src={iconThrowIn} />
    {events.filter(item => item.type == 'throw-in').length}
  </span>
  <span>
    <img src={iconFreeKick} />
    {events.filter(item => item.type == 'free-kick').length}
  </span>
  <span>
    <img src={iconGoalKick} />
    {events.filter(item => item.type == 'goal-kick').length}
  </span>
  <span>
    <img src={iconCornerKick} />
    {events.filter(item => item.type == 'corner-kick').length}
  </span>
  <span>
    <img src={iconOffside} />
    {events.filter(item => item.type == 'offside').length}
  </span>
  <span>
    <img src={iconGoal} />
    {events.filter(item => item.type == 'goal').length}
  </span>
</p>

const EventStats = ({events}) => {
  let stats = {}
  events.forEach((item, index, arr) => {
    if(index >= 0 && index < arr.length - 1) {
      // let key = arr[index-5].type+'->'+arr[index-4].type+'->'+arr[index-3].type+'->'+arr[index-2].type+'->'+arr[index-1].type+'->'+item.type
      // let key = arr[index-4].type+'->'+arr[index-3].type+'->'+arr[index-2].type+'->'+arr[index-1].type+'->'+item.type
      // let key = arr[index-3].type+'->'+arr[index-2].type+'->'+arr[index-1].type+'->'+item.type
      // let key = arr[index-2].type+'->'+arr[index-1].type+'->'+item.type
      // let key = arr[index-1].type+'->'+item.type
      let key = item.type

      if(stats[key] == undefined)
        stats[key] = []

      stats[key]
        .push(arr[index+1])
    }
  })

  return Object.keys(stats).sort().map((key) => <section>{key}<EventCounts events={stats[key]} /></section>)
}

const Chart = ({events}) => {
  const chartRef = useRef(null)

  console.log(events)

  useEffect(() => {
    /*/https://echarts.apache.org/examples/en/editor.html?c=bar-data-color/*/
    echarts
      .init(chartRef.current)
      .setOption({
        tooltip: {},
        xAxis: { data: ['free-kick', 'goal-kick', 'corner-kick', 'offset', 'goal', 'throw-in']},
        yAxis: {},
        series: [{
          name: 'Events',
          type: 'bar',
          data: [
            {value: events.filter(item => item.type == 'free-kick').length, itemStyle: { color: '#a6ddff' }},
            {value: events.filter(item => item.type == 'goal-kick').length, itemStyle: { color: '#85f2ef' }},
            {value: events.filter(item => item.type == 'corner-kick').length, itemStyle: { color: '#feb2d5' }},
            {value: events.filter(item => item.type == 'offset').length, itemStyle: { color: '#d6b2ff' }},
            {value: events.filter(item => item.type == 'goal').length, itemStyle: { color: '#ffc6a6' }},
            {value: events.filter(item => item.type == 'throw-in').length, itemStyle: { color: '#ffeb66' }}
          ]
        }]
      })
  }, [chartRef]);

  return (
    <div id="chart" ref={chartRef} style={ { minWidth: '300px', minHeight: '300px' } }/>
  )
}

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
      <aside>
        <MatchList matchList={matchList} selectMatchItem={selectMatchItem}/>
      </aside>
      <aside>
        <MatchItem matchItem={matchItem} />
      </aside>
    </main>
  )
}

const MatchList = ({matchList, selectMatchItem}) => {
  return (
    <div className="MatchList">
      <ul>
        {!matchList ? <Loader /> : matchList.map((item) => {
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
            { item.events !== undefined ? <EventCounts events={item.events} /> : <p></p> }
          </li>
        })}
      </ul>
    </div>
  )
}

const MatchItem = ({matchItem}) => {
  return (
    <div className="MatchItem">
      { !matchItem ? <Loader /> : (
        <div className="MatchInfo">
          <h2>{`${matchItem.teams.home.name} ⚽ ${matchItem.teams.away.name}`}</h2>
          {matchItem && matchItem.events && <Chart events={matchItem.events} />}

          {/* {matchItem && matchItem.events && <EventCounts events={matchItem.events} />} */}
          {/* {matchItem && matchItem.events && <EventStats events={matchItem.events} />} */}

          {/* {matchItem && matchItem.periods && (
            <div>
              {matchItem.periods.map((item, index) => {
                return <div key={index}>
                  {item.type}&nbsp;⏰&nbsp;{!item.server_time ? 'unknown' : new Date(item.server_time).toLocaleString()}
                </div>
              })}
            </div>
          )} */}

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
      )}
    </div>
  )
}

export default Matches