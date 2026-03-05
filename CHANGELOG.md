# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-03-04

### Added

- CLI scaffold command (`meto-cli init`) that bootstraps a structured project with methodology built in
- 10 interactive prompts collecting project brief (name, description, target users, tech stack, problem statement, success criteria, value proposition, out of scope, code conventions, output directory)
- 3 stack presets: Next.js + Supabase, React Native, Node.js CLI
- Custom stack option with free-text input
- Stack-aware Definition of Done generated per project
- Dry-run mode (`meto-cli init --dry-run`) to preview scaffold output without writing files
- Pre-flight checks: Node.js version validation (>= 18), git availability detection, write permission verification
- Git repository initialization with initial commit after scaffold
- SIGINT cleanup handler that removes partial scaffold on interruption
- Post-scaffold next steps guidance with conditional git init reminder
- Template rendering engine with token replacement (`{{TOKEN}}` format)
- File tree visualization for dry-run output
- `--help` and `--version` flags
