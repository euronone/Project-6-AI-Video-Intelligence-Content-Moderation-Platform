## Fork & Pull Request (For External Contributors)

### 1️⃣ Fork the Repository

```
1. Go to: https://github.com/euronone/Project-7-AI-Financial-Intelligence-Fraud-Detection-Engine
2. Click "Fork" button (top right)
3. This creates a copy under their own GitHub account
   → https://github.com/their-username/Project-7-AI-Financial-Intelligence-Fraud-Detection-Engine
```

### 2️⃣ Clone Their Fork (Not the Original)
```
# Clone THEIR fork, not the original repo
git clone https://github.com/their-username/Project-7-AI-Financial-Intelligence-Fraud-Detection-Engine.git
cd Project-7-AI-Financial-Intelligence-Fraud-Detection-Engine
```

### 3️⃣ Add Original Repo as "Upstream"
```
# This lets them sync with the original project
git remote add upstream https://github.com/euronone/Project-7-AI-Financial-Intelligence-Fraud-Detection-Engine.git

# Verify remotes
git remote -v
# Should show:
# origin    https://github.com/their-username/...  (their fork)
# upstream  https://github.com/euronone/...        (original project)
```

### 4️⃣ Create Feature Branch from Development
```
# Get latest development branch from original project
git fetch upstream
git checkout -b my-feature upstream/development

# Or if they already have development locally:
git checkout development
git pull upstream development
git checkout -b feature/my-new-feature
```

### 5️⃣ Make Changes & Commit
```
# Make their changes
# ... edit files ...

# Commit changes
git add .
git commit -m "feat: add new fraud detection algorithm"
```

### 6️⃣ Push to Their Fork
```
# Push to THEIR fork (origin), not the original repo
git push origin feature/my-new-feature
```

### 7️⃣ Create Pull Request
```
1. Go to THEIR fork on GitHub
2. GitHub shows: "Compare & pull request" button (click it)
3. Make sure it shows:
   - Base repository: euronone/Project-7... 
   - Base branch: development ⭐
   - Head repository: their-username/Project-7...
   - Compare branch: feature/my-new-feature
4. Fill in PR description
5. Click "Create pull request"
```

### 8️⃣ Project Lead Reviews & Merges
```
→ Project lead gets notification
→ Reviews the code
→ Approves or requests changes
→ Merges into development branch
```