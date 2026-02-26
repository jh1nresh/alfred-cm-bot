# Alfred CM Bot

A Web3 community Discord bot powered by Gemini AI. Alfred helps answer technical questions about DeFi, smart contracts, and blockchain.

## Features

- **AI-Powered Responses**: Responds to messages using Gemini 2.0 Flash
- **Multi-Project Support**: Custom prompts and knowledge bases per Discord server
- **Trust Score Integration**: Maiat Protocol trust score checking for linked wallets
- **On-Chain Payouts**: USDC payouts via CMTreasury contract when replies are validated
- **Reaction Tracking**: Community validation via ✅ reactions

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd alfred-cm-bot
npm install
```

### 2. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it (e.g., "Alfred CM Bot")
3. Go to the "Bot" section and click "Add Bot"
4. Copy the bot token for your `.env` file
5. Enable the following **Privileged Gateway Intents**:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT (GUILD MEMBERS)
6. Go to "OAuth2" > "URL Generator"
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Read Message History`, `Add Reactions`, `View Channels`
7. Copy the generated URL and open it to invite the bot to your server

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes |
| `DISCORD_CLIENT_ID` | Your Discord application client ID | Yes |
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini | Yes |
| `WATCH_CHANNEL_IDS` | Comma-separated list of channel IDs to monitor | Yes |
| `HELPFUL_REACTION_THRESHOLD` | Number of ✅ reactions to trigger payout (default: 3) | No |
| `CONTRACT_ADDRESS` | CMTreasury contract address | No |
| `BOT_PRIVATE_KEY` | Bot wallet private key for signing payout txs | No |
| `BASE_RPC_URL` | Base RPC URL (default: https://mainnet.base.org) | No |

#### Getting API Keys

- **Discord Token**: [Discord Developer Portal](https://discord.com/developers/applications) → Your App → Bot → Token
- **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)

#### Finding Channel IDs

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on the channel you want to monitor
3. Click "Copy Channel ID"

### 4. Run the Bot

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Multi-Project Customization

Each Discord server can have its own configuration:

1. Create `configs/projects/{guildId}.json`:
```json
{
  "guildId": "123456789",
  "projectName": "MyDeFi Protocol",
  "payoutPerReply": 0.10,
  "reactionThreshold": 3,
  "watchChannelIds": ["channel-id-1"],
  "systemPromptExtra": "You are the community manager for MyDeFi Protocol...",
  "knowledgeFiles": ["knowledge/123456789/faq.md"]
}
```

2. Add knowledge files in `knowledge/{guildId}/`:
   - `faq.md` - Frequently asked questions
   - Add any additional markdown files

## Trust Score Integration

Users can link their wallet to enable trust score checking:

```
!link 0xYourWalletAddress
```

- Score >= 30: Normal operation
- Score 10-29: Warning message, reply still generated
- Score < 10: Message silently ignored

Trust scores are fetched from Maiat Protocol API.

## On-Chain Settlement

When `CONTRACT_ADDRESS` and `BOT_PRIVATE_KEY` are set, payouts are triggered on-chain:

1. Deploy the CMTreasury contract to Base
2. Fund it with USDC
3. Set the bot wallet as the authorized caller
4. Bot will automatically call `payout()` when threshold is reached

### Deploy Contract (Base Sepolia)

```bash
npx hardhat compile
PRIVATE_KEY=your_key BASE_SEPOLIA_RPC=https://sepolia.base.org npx ts-node contracts/deploy.ts
```

## Deployment (Railway)

### Option 1: Nixpacks (Recommended)

1. Push your code to a GitHub repository
2. Go to [Railway](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo"
4. Add environment variables in Railway dashboard
5. Railway will automatically build and deploy using `railway.json`

### Option 2: Docker

```bash
docker build -t alfred-cm-bot .
docker run -d --env-file .env alfred-cm-bot
```

## Project Structure

```
src/
├── index.ts              # Main entry, Discord client setup
├── config/
│   └── loader.ts         # Project config loader
├── llm/
│   ├── gemini.ts         # Gemini API wrapper
│   └── prompt-builder.ts # System prompt builder
├── reactions/
│   └── tracker.ts        # Reaction tracking + on-chain payout
└── trust/
    ├── maiat.ts          # Maiat trust score API
    └── wallet-linker.ts  # Discord user to wallet linking

configs/
└── projects/
    └── {guildId}.json    # Per-project configuration

knowledge/
└── {guildId}/
    └── faq.md            # Project knowledge files

contracts/
├── CMTreasury.sol        # On-chain settlement contract
└── deploy.ts             # Deployment script
```

## How It Works

1. Bot listens for messages in configured `WATCH_CHANNEL_IDS`
2. Checks if user has linked wallet → fetches trust score from Maiat
3. Low trust users get warned or ignored
4. Generates reply using Gemini with project-specific prompt
5. Bot replies and adds ✅ reaction
6. Community reacts with ✅ to validate helpful responses
7. At threshold, triggers on-chain USDC payout (if configured)

## License

MIT
