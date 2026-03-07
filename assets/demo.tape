Output "/Users/ionutlomer/Desktop/Metho AI agentic/assets/demo.gif"

Set Shell "zsh"
Set FontSize 14
Set Width 1200
Set Height 650
Set Padding 20
Set Theme "Dracula"
Set TypingSpeed 40ms

# Pre-install so npx never prompts "Ok to proceed?"
Hide
Type "npm install -g meto-cli@0.8.0 2>/dev/null; clear"
Enter
Sleep 5s
Show

# Run the CLI
Type "meto-cli init --no-ai"
Enter
Sleep 4s

# 1. Project name
Type "my-saas-app"
Enter
Sleep 3s

# 2. What are you building?
Type "A project management tool for remote teams"
Enter
Sleep 3s

# 3. Who is this for?
Type "Developers and small teams"
Enter
Sleep 3s

# 4. Pick your tech stack (Next.js + Supabase - default)
Enter
Sleep 3s

# 5. Problem statement
Type "Remote teams lack visibility into project progress"
Enter
Sleep 3s

# 6. Success criteria
Type "Teams ship 2x faster with structured methodology"
Enter
Sleep 3s

# 7. Value proposition
Type "Built-in PM discipline without the overhead"
Enter
Sleep 3s

# 8. Out of scope
Type "Mobile app, enterprise SSO"
Enter
Sleep 3s

# 9. Code conventions
Type "TypeScript strict, no any, Tailwind for styling"
Enter
Sleep 3s

# 10. Project folder (default)
Enter
Sleep 3s

# 11. Workflow mode -- arrow down to select Swarm
Down
Enter

# Show success + scaffold tree
Sleep 10s

# Now show the status command
Type "meto-cli status"
Enter

# Let the dashboard display
Sleep 10s
Sleep 4s
