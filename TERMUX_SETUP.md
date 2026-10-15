# ApplicationFlow — Termux Setup

## Install

```bash
mkdir -p ~/projects
cd ~/projects/applicationflow-discord-bot
npm install
```

## Configure

```bash
cp .env.example .env
nano .env
```

```env
DISCORD_TOKEN=your_private_token
CLIENT_ID=your_application_id
GUILD_ID=your_test_server_id
APPLICATION_CATEGORY_ID=
STAFF_ROLE_ID=
ACCEPTED_ROLE_ID=
APPLICATION_LOG_CHANNEL_ID=
```

Save nano with Volume Down + O, Enter, then Volume Down + X.

## Run

```bash
npm run check
npm test
npm run deploy
npm start
```
