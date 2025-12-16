# SuperApps

A modern authentication and authorization system built with Next.js 15, featuring multiple authentication methods and role-based access control.

## Features

- 🔐 **Multiple Authentication Methods:**
  - Email/Password
  - OAuth (GitHub, Google)
  - Passkey/WebAuthn
  - TOTP (Time-based One-Time Password)

- 👥 **Authorization:**
  - Role-Based Access Control (RBAC)
  - Organization & Unit Management
  - Permission System

- 🛡️ **Security:**
  - JWT with Refresh Tokens
  - Session Management
  - Argon2 Password Hashing
  - Encrypted Secrets

- 🗄️ **Database:**
  - PostgreSQL with Drizzle ORM
  - Type-safe database queries
  - Automated migrations

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Drizzle
- **Authentication:** JWT (jose)
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/imamrozali/superapps.git
cd superapps
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `ENCRYPTION_KEY`: Generate with `openssl rand -base64 32`
- OAuth credentials (optional)

4. Setup database:
```bash
# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

5. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:seed` - Seed database

## Project Structure

```
superapps/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── v1/           # API v1
│   │       ├── auth/     # Authentication endpoints
│   │       ├── admin/    # Admin endpoints
│   │       └── user/     # User endpoints
│   ├── dashboard/        # Dashboard pages
│   └── login/           # Login page
├── lib/                  # Shared utilities
│   ├── auth/            # Auth utilities
│   │   ├── index.ts     # Auth helpers
│   │   ├── jwt.ts       # JWT utilities
│   │   ├── session.ts   # Session management
│   │   └── session-manager.ts
│   └── db/              # Database
│       ├── index.ts     # Database connection
│       ├── schema.ts    # Database schema
│       └── migrations/  # Database migrations
└── docs/                # Documentation
    ├── VERCEL_DEPLOYMENT.md
    └── MIGRATION_STRATEGY.md
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/github` - GitHub OAuth
- `GET /api/v1/auth/google` - Google OAuth
- `POST /api/v1/auth/totp/setup` - Setup TOTP
- `POST /api/v1/auth/totp/verify` - Verify TOTP
- `GET /api/v1/auth/passkey/register` - Register passkey
- `POST /api/v1/auth/passkey/verify` - Verify passkey

### User

- `GET /api/v1/user/sessions` - Get user sessions
- `DELETE /api/v1/user/sessions` - Revoke session

### Admin

- `GET /api/v1/admin/users/[userId]/sessions` - Get user sessions
- `POST /api/v1/admin/users/[userId]/sessions` - Revoke all user sessions

## Deployment

### Deploy to Vercel

See [VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

Quick deploy:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Important:** Make sure to set all environment variables in Vercel dashboard before deploying.

## Troubleshooting

### Database Connection Error

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:** Make sure `DATABASE_URL` is set correctly in environment variables.

### OAuth Errors

Make sure callback URLs are configured correctly:
- GitHub: `https://your-domain.com/api/v1/auth/github/callback`
- Google: `https://your-domain.com/api/v1/auth/google/callback`

See [VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for more troubleshooting tips.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

For support, email imam@example.com or open an issue on GitHub.
