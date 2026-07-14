import fs from "fs";

const files = [
  "src/routes/mood-board.ts",
  "src/routes/milestones.ts",
  "src/routes/quiz.ts",
  "src/routes/playlist.ts",
  "src/routes/greetings.ts",
  "src/routes/love-letters.ts",
  "src/routes/mood-of-day.ts",
  "src/routes/canvas.ts",
];

const adminBlock =
  /async function getAdminUserId\(\): Promise<number \| null> \{\s*const \{ rows \} = await pool\.query\([\s\S]*?\);\s*return rows\.length > 0 \? rows\[0\]\.id : null;\s*\}\s*/;

const authReplace = `const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }`;

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("getAdminUserId") && !content.includes("req.userAuth!.userId")) {
    console.log("Skip", file);
    continue;
  }

  if (!content.includes("getSpaceUserIdFromRequest")) {
    content = content.replace(
      'import { requireUserAuth } from "../middleware/userAuth.js";',
      'import { requireUserAuth } from "../middleware/userAuth.js";\nimport { getSpaceUserIdFromRequest } from "../utils/tenant.js";'
    );
  }

  content = content.replace(adminBlock, "");

  content = content.replace(
    /const userId = await getAdminUserId\(\);\s*if \(!userId\) \{\s*res\.status\(500\)\.json\(\{ ok: false, error: "Admin user account not found" \}\);\s*return;\s*\}/g,
    authReplace
  );

  content = content.replace(
    /const \{ rows \} = await pool\.query\(\s*"([^"]+)"\s*,\s*\[req\.userAuth!\.userId\]\s*\);/g,
    'const spaceUserId = await getSpaceUserIdFromRequest(req);\n    const { rows } = await pool.query(\n      "$1",\n      [spaceUserId]\n    );'
  );

  fs.writeFileSync(file, content);
  console.log("Updated", file);
}
