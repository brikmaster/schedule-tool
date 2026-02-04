# Railway Deployment Guide - PDF Service

## Quick Setup (5 minutes)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign in with GitHub (same account as your schedule-tool repo)

### Step 2: Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select **brikmaster/schedule-tool**
3. Railway will detect the repository

### Step 3: Configure Service
1. Click "Add variables"
2. Railway should auto-detect it's a Python app
3. Set the **Root Directory** to: `pdf-service`
4. Set the **Start Command** to: `uvicorn pdf_service:app --host 0.0.0.0 --port $PORT`

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment to complete (2-3 minutes)
3. Railway will show you the public URL (e.g., `https://your-app.up.railway.app`)

### Step 5: Update Vercel Environment Variable
1. Go to https://vercel.com/derrick-oiens-projects/schedule-tool
2. Click "Settings" → "Environment Variables"
3. Add new variable:
   - **Name:** `PDF_SERVICE_URL`
   - **Value:** `https://your-app.up.railway.app` (from Railway)
   - **Environment:** Production, Preview, Development
4. Click "Save"
5. Redeploy your Vercel app (Settings → Deployments → Redeploy)

## Alternative: Deploy via CLI

If you prefer using the command line:

```bash
# Install Railway CLI
brew install railway

# Login to Railway
railway login

# Navigate to pdf-service directory
cd pdf-service

# Initialize Railway project
railway init

# Deploy
railway up

# Get the public URL
railway domain
```

Then add that URL to Vercel environment variables as shown in Step 5 above.

## Verify Deployment

Once deployed, test the service:

```bash
curl https://your-app.up.railway.app/
```

You should see:
```json
{
  "service": "PDF Schedule Extraction Service",
  "version": "1.0.0",
  "endpoints": {...}
}
```

## Cost

Railway offers:
- **Free tier:** $5/month usage credit (enough for low-moderate usage)
- **Pro plan:** $20/month if you need more

The PDF service should easily stay within the free tier unless you're processing hundreds of PDFs daily.

## Monitoring

Railway provides:
- Real-time logs
- CPU/Memory usage metrics
- Deployment history
- Easy rollback if needed

Access these from your Railway dashboard.

## Updating the Service

Whenever you push changes to GitHub:
1. Railway auto-deploys from the `main` branch
2. New version goes live automatically
3. Zero-downtime deployments

## Troubleshooting

**Service not responding:**
- Check Railway logs for errors
- Verify PORT environment variable is set
- Ensure requirements.txt dependencies installed

**Vercel can't reach service:**
- Check PDF_SERVICE_URL in Vercel settings
- Make sure Railway service is running (not sleeping)
- Test Railway URL directly in browser

**Build fails:**
- Check Railway build logs
- Verify python version in runtime.txt
- Ensure all dependencies in requirements.txt
