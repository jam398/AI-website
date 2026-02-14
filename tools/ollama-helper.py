#!/usr/bin/env python3
"""
Ollama Copy Helper — JM AI Consulting
======================================
OPTIONAL tool.  Uses a LOCAL Ollama instance to rewrite fields in
content/site.json via natural-language instructions.

Requirements
------------
- Python 3.8+
- Ollama running locally  (http://localhost:11434)
- A model pulled, e.g.  ollama pull llama3

Usage
-----
    python ollama-helper.py

The script will:
  1. Load ../content/site.json
  2. Show editable field paths
  3. Ask for a natural-language instruction
  4. Call the local Ollama model
  5. Show a before / after diff
  6. Ask for confirmation before writing
  7. Optionally commit + push (if git is available)

NO cloud API keys or subscriptions are needed.
"""

import json
import os
import sys
import difflib
import subprocess
import textwrap
import urllib.request
import urllib.error
import copy
import socket

# ── Config ──────────────────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434/api/chat"
DEFAULT_MODEL = "deepseek-r1:8b"
CONTENT_FILE = os.path.join(os.path.dirname(__file__), "..", "content", "site.json")

# Fields the tool is allowed to modify (dot-path prefixes).
ALLOWED_PREFIXES = [
    "home.", "about.", "services.", "contact.", "footer.", "meta.siteDescription",
]

# Fields that must NEVER change.
PROTECTED_FIELDS = {
    "meta.siteTitle",
    "meta.consultant",
    "meta.email",
    "contact.email",
    "nav",
}


# ── Helpers ─────────────────────────────────────────────────────
def load_content() -> dict:
    with open(CONTENT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_content(data: dict) -> None:
    with open(CONTENT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def flatten(d: dict, prefix: str = "") -> dict:
    """Return a flat {dotpath: value} dict for display."""
    items: dict = {}
    for k, v in d.items():
        key = f"{prefix}{k}" if not prefix else f"{prefix}.{k}"
        if isinstance(v, dict):
            items.update(flatten(v, key))
        else:
            items[key] = v
    return items


def show_fields(data: dict) -> None:
    flat = flatten(data)
    print("\n── Editable fields ──")
    for path, val in flat.items():
        if any(path.startswith(p) for p in ALLOWED_PREFIXES):
            preview = str(val)[:80].replace("\n", "\\n")
            print(f"  {path}: {preview}{'…' if len(str(val)) > 80 else ''}")
    print()


def call_ollama(model: str, system_prompt: str, user_prompt: str) -> str:
    """Send a chat request to the local Ollama instance. Returns the
    assistant's reply text. Uses only stdlib (urllib)."""
    payload = json.dumps({
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }).encode("utf-8")

    req = urllib.request.Request(
        OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body.get("message", {}).get("content", "")
    except socket.timeout:
        print("\n✖ Ollama timed out (10 min). Try a smaller model: python ollama-helper.py gemma3:1b")
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(f"\n✖ Could not reach Ollama at {OLLAMA_URL}")
        print(f"  Error: {exc}")
        print("  Make sure Ollama is running:  ollama serve")
        sys.exit(1)


def compute_diff(old: str, new: str) -> str:
    old_lines = old.splitlines(keepends=True)
    new_lines = new.splitlines(keepends=True)
    diff = difflib.unified_diff(old_lines, new_lines, fromfile="BEFORE", tofile="AFTER")
    return "".join(diff)


def validate_output(original: dict, updated: dict) -> list[str]:
    """Return a list of validation errors (empty = OK)."""
    errors: list[str] = []

    # Must still be valid JSON structure (guaranteed if we get here)
    # Check protected fields
    orig_flat = flatten(original)
    new_flat = flatten(updated)

    for field in PROTECTED_FIELDS:
        if field in orig_flat and orig_flat[field] != new_flat.get(field):
            errors.append(f"Protected field '{field}' was changed.")

    # Top-level keys must remain the same
    if set(original.keys()) != set(updated.keys()):
        missing = set(original.keys()) - set(updated.keys())
        errors.append(f"Top-level keys removed: {missing}")

    return errors


def git_commit_and_push() -> None:
    """Attempt to commit and push the change. Fails gracefully."""
    try:
        root = os.path.join(os.path.dirname(__file__), "..")
        subprocess.run(
            ["git", "add", "content/site.json"],
            cwd=root, check=True, capture_output=True,
        )
        subprocess.run(
            ["git", "commit", "-m", "content: update via Ollama helper"],
            cwd=root, check=True, capture_output=True,
        )
        subprocess.run(
            ["git", "push"],
            cwd=root, check=True, capture_output=True,
        )
        print("  ✔ Committed and pushed to remote.")
    except FileNotFoundError:
        print("  ⚠ git not found — skipping commit.")
    except subprocess.CalledProcessError as exc:
        print(f"  ⚠ git command failed: {exc}")


# ── Main ────────────────────────────────────────────────────────
def main() -> None:
    print("=" * 58)
    print("  Ollama Copy Helper — JM AI Consulting")
    print("  (local LLM, no cloud, no subscription)")
    print("=" * 58)

    # Check model availability
    model = DEFAULT_MODEL
    if len(sys.argv) > 1:
        model = sys.argv[1]
    print(f"\nUsing model: {model}")
    print(f"Ollama URL:  {OLLAMA_URL}")

    # Load current content
    data = load_content()
    show_fields(data)

    # Get instruction
    print("Enter your instruction (e.g., 'Make the Home headline more formal'):")
    instruction = input("→ ").strip()
    if not instruction:
        print("No instruction given. Exiting.")
        return

    # Detect which section the instruction targets
    section_key = None
    instruction_lower = instruction.lower()
    for key in ["home", "about", "services", "contact", "footer"]:
        if key in instruction_lower:
            section_key = key
            break

    if section_key and section_key in data:
        target_data = {section_key: data[section_key]}
        section_note = f"You are editing ONLY the '{section_key}' section. Return ONLY this section as JSON (a single object with one key: '{section_key}')."
    else:
        target_data = data
        section_note = "Return the complete JSON with your edits applied."

    # Build prompts
    system_prompt = textwrap.dedent(f"""\
        You are an expert copywriter for a formal AI consulting business called
        JM AI Consulting (consultant: Jose Martinez). You will receive site
        content as JSON and a user instruction.

        RULES:
        - {section_note}
        - Do NOT wrap the output in markdown code fences.
        - Do NOT include any explanation, only output valid JSON.
        - Keep the same JSON structure and all keys intact.
        - Maintain a formal, professional tone throughout.
        - Keep edits minimal and targeted to the user's instruction.
    """)
    user_prompt = (
        f"INSTRUCTION: {instruction}\n\n"
        f"CURRENT CONTENT:\n{json.dumps(target_data, indent=2, ensure_ascii=False)}"
    )

    print(f"\n⏳ Calling Ollama ({model})… this may take a few minutes.")
    if section_key:
        print(f"   Editing section: {section_key}")
    response_text = call_ollama(model, system_prompt, user_prompt)

    # Parse response
    # Strip thinking tags from deepseek-r1 (<think>...</think>)
    json_text = response_text.strip()
    import re
    json_text = re.sub(r"<think>.*?</think>", "", json_text, flags=re.DOTALL).strip()

    # Strip code fences if present
    if "```" in json_text:
        lines = json_text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        json_text = "\n".join(lines).strip()

    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError as exc:
        print(f"\n✖ Ollama returned invalid JSON: {exc}")
        print("  Raw response (first 500 chars):")
        print(f"  {response_text[:500]}")
        return

    # Merge section back into full data
    if section_key and section_key in parsed:
        updated = copy.deepcopy(data)
        updated[section_key] = parsed[section_key]
    elif section_key and section_key not in parsed:
        # Model returned the section content without the wrapper key
        updated = copy.deepcopy(data)
        updated[section_key] = parsed
    else:
        updated = parsed

    # Validate
    errors = validate_output(data, updated)
    if errors:
        print("\n✖ Validation failed:")
        for e in errors:
            print(f"  - {e}")
        print("  No changes written.")
        return

    # Show diff
    old_json = json.dumps(data, indent=2, ensure_ascii=False)
    new_json = json.dumps(updated, indent=2, ensure_ascii=False)
    diff = compute_diff(old_json, new_json)

    if not diff.strip():
        print("\n  No changes detected.")
        return

    print("\n── Changes ──")
    print(diff)

    # Confirm
    confirm = input("\nApply these changes? [y/N] ").strip().lower()
    if confirm != "y":
        print("  Cancelled. No changes written.")
        return

    save_content(updated)
    print("  ✔ content/site.json updated.")

    # Optional: commit + push
    push = input("Commit and push to GitHub? [y/N] ").strip().lower()
    if push == "y":
        git_commit_and_push()

    print("\nDone.")


if __name__ == "__main__":
    main()
