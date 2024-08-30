import { Button, Frog } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { neynar } from 'frog/hubs'
import { handle } from 'frog/vercel'

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || ''
const TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e'
const FALLBACK_IMAGE_URL = 'https://amethyst-able-sawfish-36.mypinata.cloud/ipfs/QmNRWAmd9qSS4QodRb3Wpf6yJSHx7fmNmXtn9j58vrNkim' // Replace with an actual fallback image URL

async function getTokenBalance(address: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${TOKEN_ADDRESS}&address=${address}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log('Etherscan API response:', data);

    if (data.status === '1') {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fid=${fid}`, {
      headers: {
        'Accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log('Neynar API response:', data);

    return data.users[0]?.pfp?.url || FALLBACK_IMAGE_URL;
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    return FALLBACK_IMAGE_URL;
  }
}

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  hub: neynar({ apiKey: NEYNAR_API_KEY }),
  title: 'Token Balance Tracker'
})

app.frame('/', async (c) => {
  try {
    const { frameData, status } = c
    let balance = '0'
    let profilePicture = FALLBACK_IMAGE_URL

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
          <img src={FALLBACK_IMAGE_URL} style={{ display: 'none' }} alt="Fallback" />
        </div>
      ),
      intents: [
        <Button>Check Balance</Button>,
      ],
    })
  } catch (error) {
    console.error('Error in frame handler:', error);
    return c.res({
      image: (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#4a0e8f',
          color: 'white',
          fontSize: 24,
        }}>
          <div>Error loading frame</div>
          <div style={{ fontSize: 16, marginTop: 10 }}>Please try again later</div>
          <img src={FALLBACK_IMAGE_URL} style={{ display: 'none' }} alt="Fallback" />
        </div>
      ),
      intents: [<Button>Retry</Button>],
    });
  }
})

const isProduction = process.env.NODE_ENV === 'production'
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic })

export const GET = handle(app)
export const POST = handle(app)