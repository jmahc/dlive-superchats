import React, { useState, useEffect } from 'react'
import { render } from 'react-dom'
import { getWithCors } from './util'
import { WebSocketRetry } from './WebsocketRetry'
import './styles'
import day from 'dayjs'
// import Debug from 'debug'
import {
  IoMdContact,
  IoMdAlert,
  IoMdCheckmarkCircle,
  IoMdClose,
  IoIosGift,
  IoMdInformationCircleOutline,
} from 'react-icons/io'
import { FiAlertCircle } from 'react-icons/fi'
import { CSSTransition } from 'react-transition-group'
import Checkbox from '@material-ui/core/Checkbox'
// import {} from 'react-icons/fa'
const console = window.console
// import useMediaQuery from '@material-ui/core/useMediaQuery'

// const debug = Debug('dchats')
// const debug = console.log
const debug = window.localStorage.debug ? console.log : function() {}

function parseInitialState(data) {
  const match = /partnerStatus.*?username":"(.*?)"/.exec(data)
  debug({ match })
  if (!match) {
    throw new Error('failed to parse streamername from request')
  }

  return match[1]
}

const WS_PROXY = 'wss://ws-pass.herokuapp.com/'
// const WS_PROXY = 'ws://localhost:9000/'

async function getStreamerName(regName: string) {
  const data = await getWithCors(`https://dlive.tv/${regName}`)
  return parseInitialState(data)
}

async function openWs(regName: string, onGift: Function) {
  const streamername = await getStreamerName(regName)

  // const ws = new WebSocket(
  const ws = WebSocketRetry(
    `${WS_PROXY}wss://graphigostream.prd.dlive.tv?origin=https://dlive.tv&host=graphigostream.prd.dlive.tv`,
    'graphql-ws',
    {
      // retry: 5
    },
  )

  ws.onmessage = (mes: any) => {
    if (!mes || !mes.data) return
    const data = JSON.parse(mes.data)
    if (data.type === 'ka' || data.type === 'connection_ack') {
      return
    }
    onGift(data)
  }

  ws.onopen = function() {
    debug('onopen called')
    ws.send(
      JSON.stringify({
        type: 'connection_init',
        payload: {},
      }),
    )

    ws.send(
      JSON.stringify({
        id: '1',
        type: 'start',
        payload: {
          variables: { streamer: streamername },

          operationName: 'StreamMessageSubscription',
          query: `subscription StreamMessageSubscription($streamer: String!) {
         streamMessageReceived(streamer: $streamer) {
         type
         ... on ChatGift {
         id
         gift
         amount
         message
         recentCount
         expireDuration
         ...VStreamChatSenderInfoFrag
         __typename
     }
       __typename
     }
    }
      
      fragment VStreamChatSenderInfoFrag on SenderInfo {
         subscribing
         role
         roomRole
         sender {
         id
         username
         displayname
         avatar
         partnerStatus
         badges
         effect
         __typename
       }
       __typename
    }
      `,
        },
      }),
    )
  }
}

const lemonPrice = 0.015
const giftNames = {
  LEMON: 'lemon',
  ICE_CREAM: 'ice cream',
  DIAMOND: 'diamond',
  NINJAGHINI: 'ninjaghini',
  NINJET: 'ninjet',
}
// type giftName = 'LEMON' | 'ICE_CREAM' | 'DIAMOND' | 'NINJAGHINI' | 'NINJET'

const prices = {
  LEMON: lemonPrice,
  ICE_CREAM: lemonPrice * 10,
  DIAMOND: lemonPrice * 100,
  NINJAGHINI: lemonPrice * 1000,
  NINJET: lemonPrice * 10000,
}

document.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    e.preventDefault()
  }
})

const tips = {
  'demo-link': (
    <span>
      <a href="/#demo">demo page for testing new features</a>
    </span>
  ),
  'use-spacebar': (
    <span>
      Click on a chat and navigate to the next one with <kbd>spacebar</kbd>{' '}
    </span>
  ),
  'clear-chats-before-show': (
    <span>
      Before a show, click{' '}
      <em>
        <strong>clear all chats</strong>
      </em>{' '}
      <br />
      (refreshing the page will not lose any chats)
    </span>
  ),
  'debug-error': (
    <span>If something isn't working, try refreshing the page.</span>
  ),
}

function App() {
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(true)
  const [streamer, setStreamer] = useState(
    () => window.location.hash.slice(1) || 'demo',
  )
  function storageLocation() {
    return `${streamer}-gifts`
  }
  debug({ streamer })
  const [gifts, setGifts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageLocation()) || '[]')
    } catch (e) {
      console.error(e)
      return []
    }
  })

  const [amountFilter, setAmountFilter] = useState(0)
  const [viewType, setViewType] = useState<'gift' | 'price'>('gift')

  function onGift(data: any) {
    const giftData = data.payload.data.streamMessageReceived[0]

    if (giftData.type !== 'Gift') {
      return
    }

    debug('got gift:', giftData)

    if (giftData.gift === 'LEMON' || giftData.gift === 'ICE_CREAM') {
      return
    }
    const sender = giftData.sender.displayname
    const createdAt = giftData.createdAt.slice(0, -6)
    const amount = getGiftPrice(giftData.gift, giftData.amount)
    const avatar = giftData.sender.avatar || null

    setGifts((prevGifts) => {
      debug(prevGifts)
      return [
        ...prevGifts,
        {
          avatar: avatar && '' + avatar,
          createdAt,
          id: '' + giftData.id,
          sender: '' + sender,
          gift: giftData.gift,
          amount,
          message: '' + giftData.message,
        },
      ]
    })
  }

  useEffect(() => {
    if (streamer === 'demo') return
    localStorage.setItem(storageLocation(), JSON.stringify(gifts))
  }, [gifts])
  useEffect(() => {
    window.onhashchange = function() {
      window.location.reload()
    }
    if (streamer === 'demo') {
      let mockCount = 0
      let mockInterval = setInterval(() => {
        onGift(generateMockGift())
        mockCount++
        if (mockCount > 20) {
          clearInterval(mockInterval)
        }
      }, 500)
      setLoading(true)
      return
    }

    openWs(streamer, onGift)
      .then(() => {
        setLoading(false)
      })
      .catch((e) => {
        window.console.error(e)
        setError(`streamer not found`)
      })
  }, [])

  return (
    <div>
      <div className="superchat-container">
        {gifts.map((v: any) => {
          if (v.amount < amountFilter) return
          return (
            <CSSTransition
              appear={true}
              timeout={1000}
              classNames="fade"
              in={true}
              key={v.id}
              tabIndex={1}
              onKeyDown={(e: KeyboardEvent) => {
                console.log(e.key)
                if (e.key === ' ') {
                  // @ts-ignore
                  const nextSibling = e.currentTarget.nextSibling
                  if (nextSibling && nextSibling.matches('.superchat')) {
                    nextSibling.focus()
                  } else {
                    // @ts-ignore
                    document.querySelector('.chest [tabIndex]').focus()
                  }
                  e.preventDefault()
                }
              }}
            >
              <div className={`superchat ${v.gift}`}>
                <div className="header">
                  <div
                    className="sender-avatar"
                    style={{
                      padding: 4,
                      fontSize: 30,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {v.avatar ? (
                      <img
                        style={{ borderRadius: '50%' }}
                        width={30}
                        height={30}
                        src={v.avatar}
                      />
                    ) : (
                      <IoMdContact />
                    )}
                  </div>
                  <div className="sender-info">
                    <strong>{v.sender}</strong>
                    {renderGiftAmount(v)}
                    <span className="datetime">
                      {day(+v.createdAt).format('hh:mma')}
                    </span>
                  </div>
                </div>

                <span className="message">{'' + v.message}</span>
              </div>
            </CSSTransition>
          )
        })}
        <div className="chest">
          <div tabIndex={1}>
            <img
              src="https://dlive.tv/img/chest-close.6621d724.png"
              width={40}
              height={40}
            />
            {/* <div>chest mode ?</div> */}
          </div>
        </div>
      </div>
      <div className="error-container">
        {error && (
          <div className="error-message">
            <div className="error-icon">
              <FiAlertCircle size={24} />
            </div>
            <div className="message">{error}</div>
          </div>
        )}
      </div>

      <div className="fixed-header">
        <div className="streamer-info">
          <strong>{streamer}&nbsp;</strong>
          {!loading && !error && (
            <span className="streamer-check">
              <IoMdCheckmarkCircle />
            </span>
          )}
        </div>
        <div>
          <Checkbox
            checked={amountFilter === 5}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                setAmountFilter(5)
              } else {
                setAmountFilter(0)
              }
            }}
          />
          <label>&nbsp;exclude diamonds</label>
        </div>
        <div>
          <Checkbox
            checked={viewType === 'price'}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                return setViewType('price')
              }
              setViewType('gift')
            }}
          />
          <label>&nbsp;show (rough) dollar amounts</label>
        </div>

        <div className="tips">{renderTips()}</div>
        <button
          className="clear-superchats"
          onClick={() => {
            window.localStorage.clear()
            window.location.reload()
          }}
        >
          clear all chats
        </button>
      </div>
      <div className="clear-superchats"></div>
    </div>
  )

  function renderGiftAmount(sender: any) {
    if (viewType === 'price') {
      return (
        <span className="money">
          <strong>${sender.amount}</strong>
        </span>
      )
    }
    return (
      <span className={`money ${sender.gift}`}>
        <strong>{giftNames[sender.gift]}</strong>
      </span>
    )
  }

  function renderTips() {
    return Object.keys(tips)
      .map((v) => {
        if (localStorage.getItem(`tip-${v}`)) return
        return (
          <div key={v} className="tip">
            <div
              onClick={() => {}}
              className="x"
              style={{
                padding: 6,
                borderRadius: '50%',
                display: 'flex',
                marginRight: 4,
              }}
            >
              <IoMdInformationCircleOutline size={22} />
            </div>
            {tips[v]}
          </div>
        )
      })
      .filter(Boolean)
  }
}

render(<App />, document.getElementById('app'))

const mockMessages = `The two-thirds rule in the Senate should be eliminated. It is the refuge of the
filibusterer, the obstructionist, and the devotee of minority rule, all of whom are foreign to a
true democracy. This antique restriction adds immeasurably to clumsiness and deadlock in the
treaty-ratifying process. In March, 1920 (though not in November, 1919), it was directly
responsible for the defeat of the treaty. Effective international cooperation demands a price. That price is the yielding of some
small part of our freedom of action, our sovereignty, so that we may, through preventing
international disorders, enjoy greater freedom of action. The good things of life may be free,
but peace is not one of them. One of the supreme follies of the American people in the postVersailles years was to demand rights, while shunning responsibilities. We found ourselves in
the immoral and disastrous position of seeking all the immunities, privileges, and advantages
of riding in the international boat, while refusing to pull the laboring oar of liabilities,
responsibilities, and costs. Compromise may be as essential in peace-ratifying as in peacemaking. Certainly this
was true in Washington during 1919-1920. A stubborn refusal to compromise when the
people demand compromise not only is undemocratic, but may, as it did in 1920, lead to the
defeat of the entire treaty. Sovereignty is a sacred cow tied across the path of international cooperation. It
conjures up all kinds of unwarranted fears. But an impairment of sovereignty, of national
freedom of action, is a characteristic of treaties entered into on a free and friendly basis.
Broadly speaking, a treaty is a promise to give up, in return for something else, that which we
would ordinarily do. The United States has entered into hundreds of international agreements,
but our sovereignty is essentially unimpaired. An excess of suspicions [a Yankee horse-trading trait] is a barrier to international
cooperation. Peace can be preserved only among men of good will, for it is a blessing which
rests not so much on paper pacts as on attitudes of mind. Peace can no more be maintained by
parchment than sobriety can be maintained by constitutional amendments. In 1919 we were the most powerful and secluded of the great nations, yet we acted as
though we were the weakest and most vulnerable. Rich though we were, we feared that we
might be asked to contribute one cent more than our proper share; powerful though we were,
we feared that a few thousand of our soldiers might be sent abroad to prevent ten million from
following them. We confessed by our conduct that our representatives were not intelligent
enough to sit down at the same table with those of other nations, even though we had the
highest stack of chips and most of the high cards.`
  .split('.')
  .filter((v) => Boolean(v.trim()))

const mockSenders = [
  {
    displayname: 'Patrick',
    avatar: 'https://i.imgur.com/dIX6QcT.png',
  },
  {
    displayname: 'Spongebob',
    avatar: 'https://i.imgur.com/0O3G4ek.png',
  },
  {
    displayname: 'Mr.Krabs',
    avatar: 'https://i.imgur.com/5qV11rs.png',
  },
  {
    displayname: 'Squidward',
    avatar: 'https://i.imgur.com/wuaWw4Z.png',
  },
  { displayname: 'BoomerMan', avatar: 'https://i.imgur.com/vbNqpCk.png' },
  {
    displayname: 'Chocolate Man',
    avatar: 'https://i.imgur.com/RtoUnZG.png',
  },
  {
    displayname: 'anonymous',
    avatar: null,
  },
]

function getGiftPrice(giftname: string, amount = 1) {
  return (prices[giftname] * +amount).toFixed(2)
}

function getRandomOf(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const generateMockGift = () => {
  const newGift = JSON.parse(JSON.stringify(ex2payload))
  newGift.payload.data.streamMessageReceived[0].id = (
    Math.random() * 100000
  ).toFixed(0)

  const giftTypes = Object.keys(prices)
  newGift.payload.data.streamMessageReceived[0].gift = getRandomOf(giftTypes)

  newGift.payload.data.streamMessageReceived[0].sender = getRandomOf(
    mockSenders,
  )
  newGift.payload.data.streamMessageReceived[0].message = getRandomOf(
    mockMessages,
  )

  return newGift
}
const ex2payload = {
  payload: {
    data: {
      streamMessageReceived: [
        {
          __typename: 'ChatGift',
          type: 'Gift',
          id: '48048c51-2f05-4124-810e-6e1765104244',
          sender: {
            __typename: 'StreamchatUser',
            id: 'streamchatuser:krozmode',
            username: 'krozmode',
            displayname: 'ZORK_MODE',
            avatar: 'https://image.dlivecdn.com/avatar/default21.png',
            partnerStatus: 'NONE',
            badges: [],
            effect: null,
          },
          role: 'None',
          roomRole: 'Member',
          subscribing: false,
          createdAt: '1578979154208476310',
          gift: 'LEMON',
          amount: '1',
          recentCount: 1,
          expireDuration: 0,
          message: '',
        },
      ],
    },
  },
  id: '10',
  type: 'data',
}

// const req = {
//   "id":"2",
//   "type":"start",
//   "payload":{
//     "variables":{
//       "streamer":"theralphretort"
//     },"extensions":{
//       "persistedQuery":{
//         "version":1,"sha256Hash":"feb450b243f3dc91f7672129876b5c700b6594b9ce334bc71f574653181625d5"
//       }
//     },
//     "operationName":"StreamMessageSubscription",
//     "query":`subscription StreamMessageSubscription($streamer: String!) {
//         streamMessageReceived(streamer: $streamer) {
//           type
//           ... on ChatGift {
//             id
//             gift
//             amount
//             message
//             recentCount
//             expireDuration
//             ...VStreamChatSenderInfoFrag
//             __typename
//         }
//         ... on ChatHost {
//             id
//             viewer
//             ...VStreamChatSenderInfoFrag
//             __typename
//         }
//         ... on ChatSubscription {
//             id
//             month
//             ...VStreamChatSenderInfoFrag
//             __typename
//         }
//         ... on ChatExtendSub {
//             id
//             month
//             length
//             ...VStreamChatSenderInfoFrag
//             __typename
//         }
//         ... on ChatChangeMode {
//             mode
//             __typename
//         }
//         ... on ChatText {
//             id
//             content
//             subLength
//             ...VStreamChatSenderInfoFrag
//             __typename
//         }
//         ... on ChatSubStreak {
//             id
//             ...VStreamChatSenderInfoFrag
//             length
//             __typename
//         }
//         ... on ChatClip {
//             id
//             url
//             ...VStreamChatSenderInfoFrag
//             __typename
//         }
//         ... on ChatFollow {
//             id
//             ...VStreamChatSenderInfoFrag
//             __typename
//         }
//         ... on ChatDelete {
//             ids
//             __typename
//         }
//         ... on ChatBan {
//             id
//             ...VStreamChatSenderInfoFrag
//             bannedBy {
//               id
//               displayname
//               __typename
//           }
//           bannedByRoomRole
//           __typename
//       }
//         ... on ChatModerator {
//             id
//             ...VStreamChatSenderInfoFrag
//             add
//             __typename
//         }
//         ... on ChatEmoteAdd {
//             id
//             ...VStreamChatSenderInfoFrag
//             emote
//             __typename
//         }
//         ... on ChatTimeout {
//             id
//             ...VStreamChatSenderInfoFrag
//             minute
//             bannedBy {
//               id
//               displayname
//               __typename
//           }
//           bannedByRoomRole
//           __typename
//       }
//         ... on ChatTCValueAdd {
//             id
//             ...VStreamChatSenderInfoFrag
//             amount
//             totalAmount
//             __typename
//         }
//         ... on ChatGiftSub {
//             id
//             ...VStreamChatSenderInfoFrag
//             count
//             receiver
//             __typename
//         }
//         ... on ChatGiftSubReceive {
//             id
//             ...VStreamChatSenderInfoFrag
//             gifter
//             __typename
//         }
//         __typename
//     }
//   }

//     fragment VStreamChatSenderInfoFrag on SenderInfo {
//         subscribing
//         role
//         roomRole
//         sender {
//           id
//           username
//           displayname
//           avatar
//           partnerStatus
//           badges
//           effect
//           __typename
//       }
//       __typename
//   }
//     `
//   }}
