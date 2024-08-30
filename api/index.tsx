import { Button, Frog } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { neynar } from 'frog/hubs'
import { handle } from 'frog/vercel'

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

const NEYNAR_API_KEY = '0D6B6425-87D9-4548-95A2-36D107C12421'
const TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e'

async function getTokenBalance(address: string): Promise<string> {
  try {
    const response = await fetch(`https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${TOKEN_ADDRESS}&address=${address}&tag=latest&apikey=1P9Q31MFP8AFYU1HXJEXRHUVUV8MNIQQAQ`);
    const data = await response.json();
    if (data.status === '1') {
      // Convert balance from wei to ether (assuming 18 decimals)
      const balance = parseInt(data.result) / 1e18;
      return balance.toFixed(4);
    }
    return '0';
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return '0';
  }
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
      balance = await getTokenBalance(address)
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
          background: 'linear-gradient(to right, #4a0e8f, #280750)',
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
          width={80}
          height={80}
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
            padding: '0 40px',
            whiteSpace: 'pre-wrap',
          }}
        >
          Your token balance: {balance}
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