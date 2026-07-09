# MetroMind AI Project Customization Rules

- **Automatic Git Push**: Whenever the agent makes any modifications, edits, or fixes to the codebase files, it must automatically commit and push those changes to the remote repository.
  - Commands to run after completing changes:
    1. `git add .`
    2. `git commit -m "Auto-commit: [brief description of changes]"`
    3. `git push origin main`
  - Ensure the `.gitignore` rules are respected so that no sensitive files (like `.env`) are committed.
