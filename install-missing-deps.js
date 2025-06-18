// install-missing-deps.js
const fs = require("fs");
const { execSync } = require("child_process");

const file = "temp-deps.json"; // replace with your actual filename

const data = JSON.parse(fs.readFileSync(file, "utf-8"));
const dependencies = data.dependencies || {};
const devDependencies = data.devDependencies || {};

const install = (deps, isDev) => {
  for (const [name, version] of Object.entries(deps)) {
    try {
      require.resolve(name);
      console.log(`✅ ${name} already installed`);
    } catch (e) {
      const flag = isDev ? "-D" : "";
      const cmd = `pnpm add ${name}@${version} -F studio ${flag}`;
      console.log(`📦 Installing: ${cmd}`);
      execSync(cmd, { stdio: "inherit" });
    }
  }
};

console.log("🔍 Checking dependencies...");
install(dependencies, false);
install(devDependencies, true);
