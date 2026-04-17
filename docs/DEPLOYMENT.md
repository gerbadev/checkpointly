# Deployment Guide 🚀

This guide provides detailed instructions for deploying Checkpointly to production environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Backend Deployment (Railway)](#backend-deployment-railway)
- [Frontend Deployment (Expo)](#frontend-deployment-expo)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## Overview

Checkpointly uses a multi-tier deployment architecture:

- **Backend**: Node.js/Express on Railway
- **Database**: PostgreSQL on Railway
- **Frontend**: React Native via Expo Application Services (EAS)
- **AI**: OpenAI API (external service)

## Prerequisites

Before deploying, ensure you have:

- [x] Railway account ([railway.app](https://railway.app))
- [x] Expo account ([expo.dev](https://expo.dev))
- [x] OpenAI API key ([platform.openai.com](https://platform.openai.com))
- [x] GitHub repository with your code
- [x] Domain name (optional, for custom domain)
- [x] Apple Developer Account (for iOS deployment)
- [x] Google Play Developer Account (for Android deployment)

## Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your Checkpointly repository
5. Select the `backend` folder as the root directory

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision a PostgreSQL instance
4. Note the `DATABASE_URL` in the variables section

### Step 3: Configure Environment Variables

In Railway project settings, add the following variables:

```bash
# Database
DATABASE_URL=<automatically-set-by-railway>

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Environment
NODE_ENV=production
PORT=3000

# Optional: CORS
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

### Step 4: Deploy

1. Railway will automatically deploy on push to main branch
2. Your backend will be available at `https://your-project.up.railway.app`
3. Test the health endpoint: `GET /health`

### Step 5: Run Database Migrations

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run migrate
```

### Step 6: Custom Domain (Optional)

1. In Railway project settings, go to "Settings" → "Domains"
2. Click "Generate Domain" or add custom domain
3. Update DNS records as instructed
4. Update `ALLOWED_ORIGINS` environment variable

## Frontend Deployment (Expo)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Configure EAS

```bash
cd frontend

# Login to Expo
eas login

# Configure EAS
eas build:configure
```

This creates `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-backend.up.railway.app"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 3: Build for iOS

```bash
# First build (will create provisioning profile)
eas build --platform ios --profile production

# You'll need:
# - Apple Developer account
# - Bundle identifier (e.g., com.yourcompany.checkpointly)
# - App Store Connect app created
```

### Step 4: Build for Android

```bash
# Build Android APK/AAB
eas build --platform android --profile production

# You'll need:
# - Google Play Console account
# - App created in Play Console
# - Upload keystore (EAS can generate one)
```

### Step 5: Submit to Stores

#### iOS App Store

```bash
# Submit to App Store
eas submit --platform ios --latest

# You'll need to provide:
# - App Store Connect API Key
# - Or Apple ID credentials
```

**App Store Connect Configuration:**

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Fill in app metadata:
   - App Name: Checkpointly
   - Subtitle: AI-Powered Habit Building
   - Description: (use marketing copy)
   - Keywords: habits, goals, productivity, AI, gamification
   - Screenshots: Prepare for all required device sizes
   - Privacy Policy URL
   - Support URL

#### Google Play Store

```bash
# Submit to Play Store
eas submit --platform android --latest
```

**Google Play Console Configuration:**

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create app and fill in:
   - App name: Checkpointly
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots: Phone, 7-inch tablet, 10-inch tablet
   - Feature graphic (1024x500)
   - App icon (512x512)
   - Privacy Policy URL
   - Content rating questionnaire

### Step 6: Over-The-Air (OTA) Updates

For minor updates without app store review:

```bash
# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

Users will automatically receive updates on next app restart.

## Environment Variables

### Backend (.env)

```bash
# Required
DATABASE_URL=postgresql://user:password@host:port/database
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key-minimum-32-characters
NODE_ENV=production
PORT=3000

# Optional
ALLOWED_ORIGINS=https://yourapp.com
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)

```bash
# Required
EXPO_PUBLIC_API_URL=https://your-backend.up.railway.app

# Optional
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## Database Setup

### Initial Migration

```bash
# On Railway
railway run npm run migrate

# Or connect directly
psql $DATABASE_URL < backend/db/schema.sql
```

### Backup Strategy

**Automated Backups (Railway):**
- Railway automatically backs up PostgreSQL databases
- Retention: 7 days for free plan, 14+ days for paid plans

**Manual Backup:**

```bash
# Backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore
railway run psql $DATABASE_URL < backup.sql
```

### Database Monitoring

Monitor database health in Railway dashboard:
- CPU usage
- Memory usage
- Connection count
- Query performance

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test

  deploy-backend:
    needs: [test-backend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          # Railway auto-deploys on push to main
          echo "Backend deployed via Railway webhook"

  build-mobile:
    needs: [test-frontend]
    if: github.ref == 'refs/heads/main' && contains(github.event.head_commit.message, '[mobile-build]')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g eas-cli
      - run: cd frontend && eas build --platform all --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### Secrets Configuration

Add to GitHub repository secrets:

- `EXPO_TOKEN`: Expo access token
- `RAILWAY_TOKEN`: Railway API token (if using CLI)

## Monitoring & Logging

### Backend Monitoring

**Railway Built-in:**
- View logs in Railway dashboard
- Real-time log streaming
- Metrics: CPU, RAM, Network

**Application Logging:**

```javascript
// Use structured logging
const logger = require('./utils/logger');

logger.info('User login', { userId: user.id });
logger.error('Database error', { error: err.message });
logger.warn('High API usage', { endpoint: '/habits/create' });
```

### Error Tracking (Optional - Sentry)

**Backend:**

```bash
npm install @sentry/node
```

```javascript
// backend/app.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

**Frontend:**

```bash
npm install @sentry/react-native
```

```javascript
// frontend/app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});
```

### Uptime Monitoring

Use services like:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Pingdom](https://www.pingdom.com)
- Railway's built-in health checks

Configure health check endpoint:

```javascript
// backend/routes/health.js
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1'); // Check DB connection
    res.json({ 
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});
```

## Troubleshooting

### Backend Issues

**Database connection fails:**

```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Should be: postgresql://user:password@host:port/database

# Test connection
railway run psql $DATABASE_URL -c "SELECT 1"
```

**OpenAI API errors:**

```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check quota and limits in OpenAI dashboard
```

**Memory issues:**

```bash
# Increase Railway instance size
# Go to Settings → Resources → Upgrade plan
```

### Frontend Issues

**Build fails:**

```bash
# Clear cache
eas build --clear-cache --platform ios

# Check eas.json configuration
# Verify all environment variables are set
```

**App crashes on startup:**

```bash
# Check logs in Expo dashboard
# Verify API_URL is correct and accessible
# Test API endpoint manually

curl https://your-backend.up.railway.app/health
```

**OTA updates not working:**

```bash
# Check update channel
eas channel:view production

# Ensure app is configured for updates
# Check Updates configuration in app.json
```

### Database Issues

**Migrations fail:**

```bash
# Check migration history
railway run npm run migrate:status

# Rollback and retry
railway run npm run migrate:rollback
railway run npm run migrate
```

**Database full:**

```bash
# Check database size
railway run psql $DATABASE_URL -c "\l+"

# Upgrade Railway plan for more storage
# Or implement data retention policies
```

## Security Checklist

Before going to production:

- [ ] All environment variables are set
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database credentials are secure
- [ ] HTTPS is enforced (Railway does this automatically)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS prevention in frontend
- [ ] API endpoints require authentication where needed
- [ ] Sensitive data is not logged
- [ ] Error messages don't leak sensitive info

## Performance Optimization

### Backend

```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Add caching headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
});

// Database connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Frontend

```javascript
// Enable Hermes engine (faster startup)
// Already enabled in Expo by default

// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Lazy load screens
const ProfileScreen = lazy(() => import('./screens/Profile'));
```

## Scaling Considerations

### Horizontal Scaling

Railway supports automatic scaling:

1. Go to Settings → Autoscaling
2. Set min/max instances
3. Configure scaling triggers

### Database Scaling

For high traffic:
- Upgrade to Railway Pro for more resources
- Consider read replicas for read-heavy workloads
- Implement database connection pooling
- Add Redis for caching

### CDN for Static Assets

If using custom domain:
- Use Cloudflare for CDN and DDoS protection
- Enable Cloudflare caching for static assets

## Post-Deployment

After successful deployment:

1. **Test all critical paths**
   - User registration/login
   - Adventure creation
   - Checkpoint completion
   - Daily bonus claiming

2. **Monitor for 24 hours**
   - Watch error rates
   - Check response times
   - Monitor database connections

3. **Set up alerts**
   - Downtime alerts
   - Error rate spikes
   - High resource usage

4. **Document deployment**
   - Update this guide with any changes
   - Note any issues encountered
   - Document workarounds

## Support

For deployment issues:

- Railway: [railway.app/help](https://railway.app/help)
- Expo: [expo.dev/support](https://expo.dev/support)

---

**Last Updated**: February 2026  
**Maintainer**: Checkpointly Team