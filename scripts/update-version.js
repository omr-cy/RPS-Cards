import fs from 'fs';
import path from 'path';

// --- لوحة التحكم في الإصدار ---
// قم بتعديل هذه القيم يدوياً هنا
const VERSION = "0.1.1";
const VERSION_CODE = 11;
// ----------------------------

// دعم المتغيرات من الكوماند لاين إذا وجدت (للمرونة)
const newVersion = process.argv[2] || VERSION;
const newVersionCode = process.argv[3] || VERSION_CODE.toString();

const rootDir = process.cwd();
console.log(`Starting version update to: ${newVersion} (Code: ${newVersionCode})`);

// 1. Update root package.json
const rootPackagePath = path.join(rootDir, 'package.json');
if (fs.existsSync(rootPackagePath)) {
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  rootPackage.version = newVersion;
  fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n');
  console.log(`Updated root package.json to ${newVersion}`);
}

// 2. Update backend package.json
const backendPackagePath = path.join(rootDir, 'backend', 'package.json');
if (fs.existsSync(backendPackagePath)) {
  const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
  backendPackage.version = newVersion;
  fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2) + '\n');
  console.log(`Updated backend package.json to ${newVersion}`);
}

// 3. Update android build.gradle
const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

  // Update versionName
  buildGradle = buildGradle.replace(/versionName\s+".*"/, `versionName "${newVersion}"`);

  // Update versionCode if provided
  if (newVersionCode) {
    buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
    console.log(`Updated android build.gradle to versionName "${newVersion}" and versionCode ${newVersionCode}`);
  } else {
    // Increment versionCode automatically if not provided
    const match = buildGradle.match(/versionCode\s+(\d+)/);
    if (match) {
      const currentCode = parseInt(match[1], 10);
      const nextCode = currentCode + 1;
      buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${nextCode}`);
      console.log(`Updated android build.gradle to versionName "${newVersion}" and auto-incremented versionCode to ${nextCode}`);
    }
  }

  fs.writeFileSync(buildGradlePath, buildGradle);
}

console.log('Successfully updated all version strings.');
