"""Check that scripts/hacs-add-all.js lists every HACS component submodule.

A submodule with a hacs.json is a HACS component: an integration when it has
custom_components/, otherwise a dashboard card ("plugin"). Exits non-zero and
names what is missing, extra or in the wrong category.
"""

import configparser
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
modules = configparser.ConfigParser()
modules.read(root / ".gitmodules")

expected = {}
for section in modules.sections():
    path = modules[section]["path"]
    if (root / path / "hacs.json").exists():
        integration = (root / path / "custom_components").is_dir()
        expected[path] = "integration" if integration else "plugin"

script = (root / "scripts" / "hacs-add-all.js").read_text()
listed = {}
problems = []
for category, body in re.findall(r"^\s*(integration|plugin): \[(.*?)\]", script, re.S | re.M):
    for name in re.findall(r'"([^"]+)"', body):
        if name in listed:
            problems.append(f"listed twice: {name}")
        listed[name] = category

problems += [
    f"missing: {name} ({category})"
    for name, category in expected.items()
    if name not in listed
]
problems += [f"not a HACS submodule: {name}" for name in listed if name not in expected]
problems += [
    f"wrong category: {name} is {expected[name]}, listed as {listed[name]}"
    for name in listed
    if name in expected and listed[name] != expected[name]
]
for problem in problems:
    print(problem)
if problems:
    sys.exit(1)
print(f"hacs-add-all.js lists all {len(expected)} HACS components.")
