# ApplicationFlow — Discord Application Review Bot

ApplicationFlow is a Discord recruitment workflow bot built with JavaScript, Node.js and discord.js. Members submit structured applications, staff review them in private channels, and accepted applicants can receive a role automatically.

## Features

- Staff-published application panels.
- Structured application forms through Discord modals.
- Private review channels for applicants and staff.
- Accept and Reject controls with status locking.
- Optional automatic accepted-role assignment.
- Optional private decision logs.
- Application workload statistics and acceptance rate.
- Persistent local JSON data.
- Unit tests for interaction routing.

## Setup

```bash
npm install
cp .env.example .env
npm run check
npm test
npm run deploy
npm start
```

## Configuration

```env
DISCORD_TOKEN=your_private_token
CLIENT_ID=your_application_id
GUILD_ID=your_test_server_id
APPLICATION_CATEGORY_ID=
STAFF_ROLE_ID=
ACCEPTED_ROLE_ID=
APPLICATION_LOG_CHANNEL_ID=
```

The last four values are optional and enable category, staff-role, accepted-role and logging workflows.
