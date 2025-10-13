import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "..");
const publicDir = path.join(frontendDir, "public");
const mobileDir = path.resolve(frontendDir, "..", "mobile");
const mobileAssetsDir = path.join(mobileDir, "assets");

const SOURCE_ICON = path.join(publicDir, "favicon.svg");

const TARGETS = [
	{ file: path.join(publicDir, "favicon.png"), size: 512, format: "png" },
	{ file: path.join(publicDir, "apple-touch-icon.png"), size: 180, format: "png" },
	{ file: path.join(publicDir, "icon-192.png"), size: 192, format: "png" },
	{ file: path.join(publicDir, "icon-512.png"), size: 512, format: "png" },
	{ file: path.join(mobileAssetsDir, "icon.png"), size: 512, format: "png" },
	{ file: path.join(mobileAssetsDir, "adaptive-icon.png"), size: 1024, format: "png" },
	{ file: path.join(mobileAssetsDir, "splash-icon.png"), size: 1242, format: "png" },
	{ file: path.join(mobileAssetsDir, "favicon.png"), size: 196, format: "png" },
];

async function ensureSourceExists() {
	try {
		await fs.access(SOURCE_ICON);
	} catch (err) {
		throw new Error(`Source icon not found at ${SOURCE_ICON}.`);
	}
}

async function generateIcon({ file, size, format }) {
	await fs.mkdir(path.dirname(file), { recursive: true });
		const image = sharp(SOURCE_ICON).resize(size, size, {
			fit: "contain",
			background: { r: 7, g: 16, b: 39, alpha: 0 },
		});
	if (format === "png") {
		await image.png({ compressionLevel: 9 }).toFile(file);
	} else {
		await image.toFile(file);
	}
	console.log(`Generated ${path.relative(frontendDir, file)} (${size}x${size})`);
}

async function run() {
	await ensureSourceExists();
	for (const target of TARGETS) {
		await generateIcon(target);
	}
	console.log("Icon assets refreshed (web + mobile).");
}

run().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
