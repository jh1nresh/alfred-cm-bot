# Alfred CM Bot

A Web3 community Discord bot powered by Gemini AI. Alfred helps answer technical questions about DeFi, smart contracts, and blockchain.

## Features

- Responds to messages in configured channels using Gemini 2.0 Flash
- Tracks ✅ reactions on bot replies for community validation
- Logs payout triggers when replies reach the reaction threshold
- Ready for Railway deployment

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
| `HELPFUL_REACTION_THRESHOLD` | Number of ✅ reactions to trigger payout log (default: 3) | No |

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

## Deployment (Railway)

1. Push your code to a GitHub repository
2. Go to [Railway](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo"
4. Add environment variables in Railway dashboard
5. Railway will automatically build and deploy using `railway.json`

## Project Structure

```
src/
├── index.ts              # Main entry, Discord client setup
├── llm/
│   └── gemini.ts         # Gemini API wrapper
└── reactions/
    └── tracker.ts        # Reaction tracking + payout trigger log
```

## How It Works

1. Bot listens for messages in configured `WATCH_CHANNEL_IDS`
2. When a message arrives, it generates a reply using Gemini 2.0 Flash
3. Bot replies to the message and adds a ✅ reaction
4. Community members can react with ✅ to validate helpful responses
5. When a reply reaches `HELPFUL_REACTION_THRESHOLD` ✅ reactions, a payout trigger is logged

## License

MIT
