import { watch } from "chokidar";
import { writeFileSync, cpSync } from "fs";
import { resolve } from "path";
import { build } from "bun";
import { GET_AUTH_API_URL } from "../src/env";

const srcDir = "./src";
const staticDir = "./static";
const distDir = "./dist";

async function buildSrc() {
  try {
    await build({
      entrypoints: ["./src/background.ts", "./src/popup.ts", "./src/offscreen.ts"],
      outdir: "./dist",
      target: "browser",
    });
    console.log("Source files built successfully");
  } catch (error) {
    console.error("Error building source files:", error);
  }
}

function copyStatic() {
  try {
    cpSync(staticDir, distDir, { recursive: true });
    console.log("Static files copied to dist");
  } catch (error) {
    console.error("Error copying static files:", error);
  }
}

function generateManifest() {
  const manifest = {
    manifest_version: 3,
    name: "Kindle Highlights Extractor",
    version: "1.1",
    description: "Regularly pulls Kindle highlights from read.amazon.com.",
    action: {
      default_popup: "popup.html",
    },
    permissions: [
      "alarms",
      "storage",
      "cookies",
      "offscreen",
      "storage",
      "https://read.amazon.com/*",
      GET_AUTH_API_URL,
    ],
    host_permissions: ["https://read.amazon.com/*", GET_AUTH_API_URL],
    background: {
      service_worker: "background.js",
    },
  };

  writeFileSync(resolve(__dirname, "../dist/manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("manifest.json generated successfully.");
}

async function buildAll() {
  await buildSrc();
  copyStatic();
  generateManifest();
}

// Initial build
buildAll();

// Watch for changes in src directory
const srcWatcher = watch(srcDir, { persistent: true });

srcWatcher.on("change", async (path) => {
  console.log(`File ${path} in src has been changed`);
  await buildSrc();
  generateManifest();
});

// Watch for changes in static directory
const staticWatcher = watch(staticDir, { persistent: true });

staticWatcher.on("change", async (path) => {
  console.log(`File ${path} in static has been changed`);
  copyStatic();
  generateManifest();
});

console.log(`Watching ${srcDir} and ${staticDir} for changes...`);
