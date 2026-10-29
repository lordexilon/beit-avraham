# Agent Skills Directory

This directory contains specialized "Skills" for the agent. Unlike simple text workflows, Skills can contain executable code (Python, Bash, Node) to perform complex tasks.

## Structure
Each skill should be in its own subdirectory:
```
.agent/skills/
  `-- my_skill/
      |-- SKILL.md        # Instructions on how to use the skill
      `-- script.py       # (Optional) Executable script
```

## Integration
You can call these skills from your Workflows or manually via the Agent.
