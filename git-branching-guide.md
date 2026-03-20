# Branching Strategy for AI Video Intelligence Content Moderation Platform

## Project Overview
This document outlines the branching strategy for the [AI Video Intelligence Content Moderation Platform](https://github.com/euronone/Project-6-AI-Video-Intelligence-Content-Moderation-Platform).

---

## Branch Structure

### Main Branches

| Branch | Purpose | Protection Level |
|--------|---------|------------------|
| `main` | Production-ready code only | **Protected** - Requires PR + approval |
| `development` | Active development work | Moderate - PR recommended |
| `testing` | Integration testing and QA | Moderate - PR recommended |

---

## 1. Creating the Branches

### Initial Setup Commands

```bash
# First, make sure you're on the main branch and it's up to date
git checkout main
git pull origin main

# Create and push the development branch
git checkout -b development
git push -u origin development

# Create and push the testing branch
git checkout -b testing
git push -u origin testing

# Return to main branch
git checkout main
```

---

## 2. Recommended Workflow

### Development Flow

```
feature/new-feature → development → testing → main
```

**Step-by-Step Process:**

1. **Create feature branches from `development`**
   - All new features start here
   - Branch naming: `feature/feature-name`

2. **Work on features in feature branches**
   - Make commits regularly
   - Push to remote frequently

3. **Merge completed features back to `development`**
   - Via Pull Request (recommended)
   - Code review before merging

4. **Merge `development` → `testing`**
   - When ready for integration testing
   - Run comprehensive test suites

5. **Merge `testing` → `main`**
   - Only after successful testing
   - Represents production-ready code

---

## 3. Protecting Your Main Branch

### GitHub Branch Protection Rules

Navigate to: **Settings → Branches → Add branch protection rule**

**Configuration for `main` branch:**

- ✅ Branch name pattern: `main`
- ✅ Require pull request before merging
- ✅ Require approvals (minimum: 1)
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (optional but recommended)

---

## 4. Daily Development Workflow

### Starting a New Feature

```bash
# Switch to development and get latest changes
git checkout development
git pull origin development

# Create a new feature branch
git checkout -b feature/video-upload-api

# ... do your work ...

# Stage and commit changes
git add .
git commit -m "Add video upload API endpoint"

# Push to remote
git push origin feature/video-upload-api
```

### Creating a Pull Request

1. Go to GitHub repository
2. Click "Pull requests" → "New pull request"
3. Base: `development` ← Compare: `feature/video-upload-api`
4. Add description and request reviewers
5. Wait for approval and merge

---

## 5. Moving to Testing Phase

### Merging Development to Testing

```bash
# Switch to testing branch
git checkout testing
git pull origin testing

# Merge development changes
git merge development

# Push to remote
git push origin testing

# Run your test suites on the testing branch
```

### Testing Checklist

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] API endpoints tested
- [ ] Video processing pipeline validated
- [ ] Content moderation accuracy verified
- [ ] Performance benchmarks met
- [ ] Security scanning completed

---

## 6. Production Deployment

### Merging Testing to Main

**⚠️ Always use Pull Request for main branch**

```bash
# Create PR on GitHub from testing → main
# After approval and checks pass:

git checkout main
git pull origin main
git merge testing
git push origin main

# Tag the release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

---

## 7. Quick Setup Script

Save this as `setup-branches.sh`:

```bash
#!/bin/bash
# Branching setup script for Project-6-AI-Video-Intelligence

echo "🚀 Setting up branches for AI Video Intelligence Platform..."
echo ""

# Ensure we're on main and up to date
echo "📥 Updating main branch..."
git checkout main
git pull origin main

# Create development branch
echo "🔨 Creating development branch..."
git checkout -b development
git push -u origin development
echo "✓ Development branch created"
echo ""

# Create testing branch
echo "🧪 Creating testing branch..."
git checkout -b testing  
git push -u origin testing
echo "✓ Testing branch created"
echo ""

# Return to development for work
git checkout development
echo "✓ Setup complete! Currently on development branch"
echo ""
echo "📊 Current branch structure:"
git branch -a
echo ""
echo "🎯 Ready to start development!"
```

**To use:**
```bash
chmod +x setup-branches.sh
./setup-branches.sh
```

---

## 8. Branch Naming Conventions

### Feature Branches
- Format: `feature/description-of-feature`
- Examples:
  - `feature/video-upload-api`
  - `feature/content-moderation-ml-model`
  - `feature/user-authentication`

### Bugfix Branches
- Format: `bugfix/description-of-fix`
- Examples:
  - `bugfix/video-processing-timeout`
  - `bugfix/api-rate-limiting`

### Hotfix Branches (urgent production fixes)
- Format: `hotfix/description-of-fix`
- Branch from: `main`
- Merge to: `main` AND `development`

---

## 9. Common Git Commands Reference

### Viewing Branches
```bash
# List local branches
git branch

# List all branches (including remote)
git branch -a

# See current branch
git branch --show-current
```

### Switching Branches
```bash
# Switch to existing branch
git checkout development

# Create and switch to new branch
git checkout -b feature/new-feature
```

### Updating Branches
```bash
# Get latest changes from remote
git pull origin development

# Update your current branch with another branch
git merge development
```

### Deleting Branches
```bash
# Delete local branch
git branch -d feature/completed-feature

# Delete remote branch
git push origin --delete feature/completed-feature
```

---

## 10. Best Practices

### ✅ Do's

- **Commit often** with clear, descriptive messages
- **Pull before you push** to avoid conflicts
- **Create small, focused features** that are easier to review
- **Write tests** for new features before merging
- **Use pull requests** for all merges to main branches
- **Keep branches up to date** with their parent branch
- **Delete merged branches** to keep repository clean

### ❌ Don'ts

- **Don't commit directly to `main`** - always use PR workflow
- **Don't merge without testing** in the testing branch first
- **Don't force push** to shared branches
- **Don't leave branches stale** - merge or delete inactive branches
- **Don't include sensitive data** in commits (API keys, passwords)
- **Don't commit large binary files** without Git LFS

---

## 11. Troubleshooting

### Merge Conflicts

```bash
# When you encounter conflicts
git status  # See conflicting files

# Edit files to resolve conflicts
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit -m "Resolve merge conflicts"
```

### Accidentally Committed to Wrong Branch

```bash
# If you haven't pushed yet
git reset --soft HEAD~1  # Undo last commit, keep changes
git checkout correct-branch
git add .
git commit -m "Your message"
```

---

## 12. CI/CD Integration (Future Enhancement)

Consider setting up GitHub Actions for:

- **Automated Testing** on PR to `development`
- **Code Quality Checks** (linting, formatting)
- **Security Scanning** before merging to `testing`
- **Automated Deployment** when merging to `main`

---

## Project Contacts

- **Project Lead**: [Your Name]
- **Repository**: https://github.com/euronone/Project-6-AI-Video-Intelligence-Content-Moderation-Platform
- **Documentation**: [Link to docs]

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-03-16 | 1.0 | Initial branching strategy | Project Lead |

---

**Last Updated**: March 16, 2026
