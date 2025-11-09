# Sentinel - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Prerequisites Check
```bash
node --version  # Should be >= 16.x
mongod --version  # Should be >= 5.x
```

### Step 1: Install MongoDB (if not installed)

**Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install with default settings
3. Start MongoDB service

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Step 2: Clone and Setup

```bash
# Clone repository
git clone https://github.com/manirht/Sentinel.git
cd Sentinel

# Backend Setup
cd backend
npm install
node seed.js  # Creates sample data
npm run dev   # Starts on http://localhost:5000

# Open new terminal for frontend
cd ../frontend
npm install
npm run dev   # Starts on http://localhost:5173
```

### Step 3: Login and Explore

1. Open browser: http://localhost:5173
2. Login with: `admin@sentinel.com` / `admin123`
3. Explore Dashboard, Alerts, and Rules

## 📦 What's Included in Sample Data

- ✅ 2 Users (Admin & Operator)
- ✅ 4 Pre-configured Rules
- ✅ 5 Sample Alerts (various states)

## 🎯 Quick Demo Flow

### 1. View Dashboard
- See alert distribution
- Check top offenders
- View recent events

### 2. Create Alert
- Go to Alerts page
- Click "Create Alert"
- Fill form and submit
- Watch rule engine process it

### 3. Configure Rules
- Go to Rules page
- Edit existing rules
- Create new custom rules
- Toggle rules on/off

### 4. Test Escalation
Create 3 overspeed alerts for same driver within 1 hour:
```bash
# Use the Create Alert form 3 times with same driver ID
Driver ID: DRV001
Driver Name: Test Driver
Source: Overspeed
```
System will auto-escalate to CRITICAL!

## 🔧 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongosh  # Should connect

# If not, start MongoDB
# Windows: Start MongoDB Service from Services
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port Already in Use
```bash
# Backend (Port 5000)
# Kill process on port 5000
netstat -ano | findstr :5000  # Windows
lsof -ti:5000 | xargs kill  # Mac/Linux

# Frontend (Port 5173)
# Change port in frontend/vite.config.js
```

### Dependencies Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📚 Next Steps

1. **Read Full Documentation**: Check main README.md
2. **Explore API**: Test endpoints with Postman
3. **Customize Rules**: Adapt rules to your needs
4. **Deploy**: Follow deployment guide in README

## 💡 Tips

- Use browser DevTools to see API calls
- Check backend logs for rule engine activity
- Background jobs run every 2-5 minutes
- Dashboard auto-refreshes every 30 seconds

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot connect to MongoDB" | Ensure MongoDB is running |
| "Port 5000 already in use" | Change PORT in backend/.env |
| "Module not found" | Run `npm install` in both folders |
| "401 Unauthorized" | Token expired, login again |
| "Rules not working" | Check rules are enabled in Rules page |

## 📞 Need Help?

- Check main README.md for detailed docs
- Review API documentation
- Check browser console for errors
- Check backend logs in `backend/logs/`

---

**Happy Coding! 🚀**
