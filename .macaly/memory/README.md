# Conversation Memory

This directory stores durable, project-specific memory for the current Macaly chat.

Use this memory only when it is relevant to the user's request, such as questions about prior decisions, preferences, constraints, current state, open questions, or lessons learned. Do not read it on every turn.

Start with profile.md. For topic-specific history, inspect topics/.

Do not store raw conversation transcripts, secrets, tokens, passwords, private keys, or long tool outputs here.
