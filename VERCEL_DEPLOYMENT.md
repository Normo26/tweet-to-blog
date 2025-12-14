# Vercel Deployment Guide

## ⚠️ CRITICAL: SQLite Limitation on Vercel

**This application uses SQLite with `better-sqlite3`, which has severe limitations on Vercel:**

1. **Ephemeral Storage**: The `/tmp` directory is used, but data is **NOT persisted** between deployments
2. **Native Dependencies**: `better-sqlite3` requires native compilation - may fail on Vercel
3. **Serverless Architecture**: Each API route runs separately - shared state is difficult
4. **404 Errors**: If `better-sqlite3` fails to compile, you'll get 404 errors

## Quick Fix for 404 Errors

If you're seeing 404 errors, it's likely because:
1. `better-sqlite3` failed to compile during build
2. Database initialization is failing
3. API routes are crashing on database access

**Check Vercel Build Logs** for errors related to:
- `better-sqlite3` compilation
- Database initialization errors
- Native module build failures

## Recommended Solutions

### Option 1: Use Vercel Postgres (Recommended)
Replace SQLite with Vercel Postgres for persistent, serverless-friendly database:
- Free tier available
- Persistent storage
- Works seamlessly with Vercel

### Option 2: Use External Database
Use a managed database service:
- **Supabase** (PostgreSQL)
- **PlanetScale** (MySQL)
- **MongoDB Atlas**
- **Railway** (PostgreSQL)

### Option 3: Keep SQLite (Development Only)
Current setup works for development but **NOT recommended for production** on Vercel.

## Current Configuration

The app is configured to:
- Use `/tmp` directory in production (Vercel)
- Fall back to in-memory database if file system access fails
- Handle errors gracefully

## Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```
OPENAI_API_KEY=your_openai_key
WORDPRESS_URL=your_wordpress_url
WORDPRESS_USERNAME=your_username
WORDPRESS_PASSWORD=your_password
```

## Build Configuration

The `next.config.js` is configured to:
- Externalize `better-sqlite3` for serverless
- Set proper webpack configuration

## Troubleshooting

If you see 404 errors:
1. Check Vercel deployment logs
2. Verify API routes are in `app/api/` directory
3. Ensure `vercel.json` is configured correctly
4. Check that all dependencies are installed

If database errors occur:
1. Check Vercel function logs
2. Verify `/tmp` directory is writable
3. Consider migrating to a proper database

