const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const pythonScript = path.resolve(
  repoRoot,
  "backend",
  "utils",
  "extract_resume_data.py"
);

const candidates =
  process.platform === "win32"
    ? ["py", "python", "python3"]
    : ["python3", "python", "py"];

let lastError;

for (const cmd of candidates) {
  try {
    const result = spawnSync(cmd, [pythonScript], {
      stdio: "inherit",
      cwd: repoRoot,
    });
    if (result.status === 0) {
      process.exit(0);
    }
    lastError = new Error(
      `${cmd} exited with code ${result.status ?? "unknown"}`
    );
  } catch (error) {
    lastError = error;
  }
}

console.error(
  `Failed to run ${path.relative(repoRoot, pythonScript)} with any Python command.`
);
if (lastError) {
  console.error(lastError.message);
}
process.exit(1);

