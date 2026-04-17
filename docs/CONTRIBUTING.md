# Contributing to Checkpointly 🤝

First off, thank you for considering contributing to Checkpointly! It's people like you that make Checkpointly such a great tool for building better habits.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to a positive environment:

- ✅ Using welcoming and inclusive language
- ✅ Being respectful of differing viewpoints and experiences
- ✅ Gracefully accepting constructive criticism
- ✅ Focusing on what is best for the community
- ✅ Showing empathy towards other community members

Examples of unacceptable behavior:

- ❌ The use of sexualized language or imagery
- ❌ Trolling, insulting/derogatory comments, and personal or political attacks
- ❌ Public or private harassment
- ❌ Publishing others' private information without explicit permission
- ❌ Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 14+
- Git
- Code editor (we recommend VS Code)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/checkpointly.git
cd checkpointly
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/original-owner/checkpointly.git
```

### Installation

Follow the installation instructions in [README.md](README.md) to set up your development environment.

### Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

## How Can I Contribute?

### Reporting Bugs 🐛

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title** - Descriptive summary of the issue
- **Steps to reproduce** - Detailed steps to recreate the bug
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Screenshots** - If applicable
- **Environment**:
  - OS: [e.g., iOS 15, Android 12, macOS 13]
  - App version: [e.g., 1.0.0]
  - Device: [e.g., iPhone 13, Pixel 6]

**Example:**

```markdown
**Bug**: Checkpoint completion doesn't award XP

**Steps to Reproduce**:
1. Open the "Learn C++" adventure
2. Complete the first checkpoint
3. Check XP in profile

**Expected**: +20 XP added to total
**Actual**: XP remains unchanged

**Environment**: 
- iOS 16.2, iPhone 14
- App version 1.0.2
```

### Suggesting Enhancements 💡

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title** - Concise description of the enhancement
- **Use case** - Why this enhancement would be useful
- **Detailed description** - How it should work
- **Mockups/Examples** - Visual representations if applicable

**Example:**

```markdown
**Enhancement**: Add weekly progress summary email

**Use Case**: Users want to review their weekly progress without opening the app

**Description**:
- Send automated email every Sunday evening
- Include: XP earned, adventures completed, current streak
- Provide opt-out option in settings

**Mockup**: [Attach image]
```

### Your First Code Contribution 🎉

Unsure where to begin? Look for issues labeled:

- `good first issue` - Simple issues perfect for beginners
- `help wanted` - Issues where we need community help
- `bug` - Known bugs that need fixing

Comment on the issue to let others know you're working on it!

## Development Process

### 1. Set Up Development Environment

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your local configuration
npm run dev

# Frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with your local configuration
npm start
```

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run specific test file
npm test -- CheckpointScreen.test.tsx
```

### 4. Manual Testing

- Test on both iOS and Android if UI changes
- Test with different screen sizes
- Verify API responses
- Check error handling

## Style Guidelines

### JavaScript/TypeScript

We use ESLint and Prettier for code formatting.

```bash
# Check linting
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

**Key Conventions:**

```javascript
// ✅ Good
const getUserById = async (userId) => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  return user;
};

// ❌ Bad
async function get_user(id) {
  return await db.query('SELECT * FROM users WHERE id = ' + id);
}
```

### React/React Native

```typescript
// ✅ Good - Functional component with TypeScript
interface CheckpointCardProps {
  checkpoint: Checkpoint;
  onComplete: (id: string) => void;
}

const CheckpointCard: React.FC<CheckpointCardProps> = ({ 
  checkpoint, 
  onComplete 
}) => {
  return (
    <TouchableOpacity onPress={() => onComplete(checkpoint.id)}>
      <Text>{checkpoint.title}</Text>
    </TouchableOpacity>
  );
};

// ❌ Bad - Class component, no types
class CheckpointCard extends React.Component {
  render() {
    return (
      <TouchableOpacity onPress={() => this.props.onComplete(this.props.checkpoint.id)}>
        <Text>{this.props.checkpoint.title}</Text>
      </TouchableOpacity>
    );
  }
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `CheckpointCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Screens: `PascalCase.tsx` (e.g., `DashboardScreen.tsx`)

### Directory Structure

```
components/
├── common/          # Reusable components
├── checkpoint/      # Checkpoint-specific components
└── adventure/       # Adventure-specific components

utils/
├── api.ts          # API helpers
├── format.ts       # Formatting utilities
└── validation.ts   # Validation functions
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(checkpoint): add ability to skip checkpoint

Users can now skip a checkpoint and mark it as "not applicable"
without losing their streak.

Closes #123

---

fix(auth): resolve token expiration issue

Fixed bug where JWT tokens were expiring prematurely due to
incorrect timezone handling.

Fixes #456

---

docs(readme): update installation instructions

Added PostgreSQL setup steps and clarified Node.js version
requirements.
```

### Commit Best Practices

- ✅ Keep commits atomic (one logical change per commit)
- ✅ Write descriptive commit messages
- ✅ Reference issues in commit messages
- ❌ Don't commit commented-out code
- ❌ Don't commit console.logs or debugger statements
- ❌ Don't commit sensitive data (.env files, API keys)

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated if needed
- [ ] No merge conflicts with main branch

### Submitting Pull Request

1. **Update your branch** with latest main:

```bash
git fetch upstream
git rebase upstream/main
```

2. **Push to your fork**:

```bash
git push origin feature/your-feature-name
```

3. **Create Pull Request** on GitHub

4. **Fill in PR template**:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Pull Request Review Process

1. **Automated checks** run (tests, linting)
2. **Code review** by maintainers
3. **Feedback** - Address any requested changes
4. **Approval** - At least one maintainer approval required
5. **Merge** - Maintainer will merge your PR

### After Merge

Your contribution will be included in the next release! 🎉

- Update your local repository
- Delete your feature branch
- Check the changelog for credit

## Development Tips

### Debugging

**Backend:**

```javascript
// Use debug module
const debug = require('debug')('checkpointly:habits');

debug('Creating new habit', { userId, title });
```

**Frontend:**

```typescript
// React Native Debugger
// Use console.log, console.warn, console.error

// Check network requests
console.log('API Response:', response.data);
```

### Testing Tips

```javascript
// Write descriptive test names
describe('CheckpointService', () => {
  it('should award XP when checkpoint is completed for first time today', async () => {
    // Test implementation
  });
  
  it('should not award XP when checkpoint is completed again same day', async () => {
    // Test implementation
  });
});
```

### Database Queries

```javascript
// ✅ Use parameterized queries (prevents SQL injection)
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ❌ Never concatenate user input
const user = await db.query(
  `SELECT * FROM users WHERE id = ${userId}` // DANGEROUS!
);
```

## Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas

### Getting Help

- Check [README.md](README.md) for setup instructions
- Search existing issues before creating new ones
- Ask in GitHub Discussions for general questions
- Be patient and respectful

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor highlights

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask! We're here to help:

- Comment on related issues
- Reach out via email: gerba69420@gmail.com

---

**Thank you for contributing to Checkpointly! 🙏**

Together, we're helping people build better habits, one checkpoint at a time.