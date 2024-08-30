import { Button, Frog } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { neynar } from 'frog/hubs'
import { handle } from 'frog/vercel'

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

// Replace with your actual API key
const NEYNAR_API_KEY = '0D6B6425-87D9-4548-95A2-36D107C12421'

// We'll use a mock function for token balance since we can't use ethers directly
async function getTokenBalance(): Promise<string> {
  // This is a mock implementation. In a real scenario, you'd call an API or use a library to get the actual balance
  return Promise.resolve('100.0') // Mock balance
}

async function getFarcasterProfilePicture(fid: number): Promise<string> {
  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fid=${fid}`, {
      headers: {
        'Accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    })
    const data = await response.json()
    return data.users[0]?.pfp?.url || 'https://example.com/default-profile-picture.jpg'
  } catch (error) {
    console.error('Error fetching profile picture:', error)
    return 'https://example.com/default-profile-picture.jpg'
  }
}

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  hub: neynar({ apiKey: NEYNAR_API_KEY }),
  title: 'Token Balance Tracker'
})

app.frame('/', async (c) => {
  const { frameData, status } = c
  let balance = '0'
  let profilePicture = 'https://example.com/default-profile-picture.jpg'

  if (status === 'response' && frameData) {
    const { fid, address } = frameData
    if (address) {
      balance = await getTokenBalance()
    }
    if (fid) {
      profilePicture = await getFarcasterProfilePicture(fid)
    }
  }

  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(to right, #432889, #17101F)',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <img
          src={profilePicture}
          width={100}
          height={100}
          style={{ borderRadius: '50%', marginBottom: '20px' }}
          alt="Profile"
        />
        <div
          style={{
            color: 'white',
            fontSize: 32,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 10,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {status === 'response'
            ? `Your token balance: ${balance}`
            : 'Click to see your token balance'}
        </div>
      </div>
    ),
    intents: [
      <Button>Check Balance</Button>,
    ],
  })
})

const isProduction = process.env.NODE_ENV === 'production'
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic })

export const GET = handle(app)
export const POST = handle(app)