"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Script: Reassign all content to original user (poudelashish0718@gmail.com)
 *
 * This script moves all uploaded content from any user to the original
 * poudelashish0718@gmail.com user account.
 */
var connection_js_1 = __importDefault(require("../src/db/connection.js"));
function reassignContent() {
    return __awaiter(this, void 0, void 0, function () {
        var client, targetUserRows, allUsers_1, targetUserId_1, targetEmail, allUsers, contentTables, totalRowsMoved, _i, contentTables_1, table, tableCheck, countRows, rowsToMove, existingBranding, deleteResult, firstBranding, deleteResult, updateResult, movedCount, error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, connection_js_1.default.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 25, 27, 29]);
                    console.log("🚀 Starting content reassignment to poudelashish0718@gmail.com...\n");
                    return [4 /*yield*/, client.query("BEGIN")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.query("SELECT id, email, display_name, google_id \n       FROM users \n       WHERE email = $1 OR email LIKE $2 OR google_id LIKE $3\n       ORDER BY created_at ASC \n       LIMIT 1", ['poudelashish0718@gmail.com', '%poudelashish0718%', '%poudelashish0718%'])];
                case 4:
                    targetUserRows = (_a.sent()).rows;
                    if (!(targetUserRows.length === 0)) return [3 /*break*/, 6];
                    console.error("❌ Error: User with email poudelashish0718@gmail.com not found!");
                    console.log("\nAvailable users:");
                    return [4 /*yield*/, client.query("SELECT id, email, display_name, created_at FROM users ORDER BY created_at ASC")];
                case 5:
                    allUsers_1 = (_a.sent()).rows;
                    allUsers_1.forEach(function (user) {
                        console.log("  - ID: ".concat(user.id, ", Email: ").concat(user.email, ", Name: ").concat(user.display_name, ", Created: ").concat(user.created_at));
                    });
                    throw new Error("Target user not found");
                case 6:
                    targetUserId_1 = targetUserRows[0].id;
                    targetEmail = targetUserRows[0].email;
                    console.log("\u2705 Found target user:");
                    console.log("   ID: ".concat(targetUserId_1));
                    console.log("   Email: ".concat(targetEmail));
                    console.log("   Name: ".concat(targetUserRows[0].display_name));
                    console.log("   Google ID: ".concat(targetUserRows[0].google_id, "\n"));
                    return [4 /*yield*/, client.query("SELECT id, email, display_name FROM users ORDER BY created_at ASC")];
                case 7:
                    allUsers = (_a.sent()).rows;
                    console.log("📋 All users in database:");
                    allUsers.forEach(function (user) {
                        var marker = user.id === targetUserId_1 ? "👉 TARGET" : "";
                        console.log("   ID: ".concat(user.id, ", Email: ").concat(user.email, ", Name: ").concat(user.display_name, " ").concat(marker));
                    });
                    console.log();
                    contentTables = [
                        "media_items",
                        "love_jar",
                        "milestones",
                        "bucket_list",
                        "mood_board",
                        "hero_banners",
                        "collections",
                        "playlist_songs",
                        "mood_of_day",
                        "quiz_questions",
                        "time_greetings",
                        "love_letters",
                        "canvas_drawings",
                        "branding",
                    ];
                    totalRowsMoved = 0;
                    // Reassign all content to target user
                    console.log("🔄 Reassigning content to target user...\n");
                    _i = 0, contentTables_1 = contentTables;
                    _a.label = 8;
                case 8:
                    if (!(_i < contentTables_1.length)) return [3 /*break*/, 23];
                    table = contentTables_1[_i];
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 21, , 22]);
                    return [4 /*yield*/, client.query("\n          SELECT column_name\n          FROM information_schema.columns\n          WHERE table_name = $1 AND column_name = 'user_id'\n        ", [table])];
                case 10:
                    tableCheck = _a.sent();
                    if (tableCheck.rows.length === 0) {
                        console.log("  \u23ED\uFE0F  Skipping ".concat(table, " (no user_id column)"));
                        return [3 /*break*/, 22];
                    }
                    return [4 /*yield*/, client.query("\n          SELECT COUNT(*) as count FROM ".concat(table, " WHERE user_id != $1\n        "), [targetUserId_1])];
                case 11:
                    countRows = (_a.sent()).rows;
                    rowsToMove = parseInt(countRows[0].count);
                    if (rowsToMove === 0) {
                        console.log("  \u2705 ".concat(table, ": No rows to move (all already owned by target user)"));
                        return [3 /*break*/, 22];
                    }
                    if (!(table === 'branding')) return [3 /*break*/, 19];
                    return [4 /*yield*/, client.query("SELECT user_id FROM branding WHERE user_id = $1", [targetUserId_1])];
                case 12:
                    existingBranding = (_a.sent()).rows;
                    if (!(existingBranding.length > 0)) return [3 /*break*/, 14];
                    return [4 /*yield*/, client.query("DELETE FROM branding WHERE user_id != $1", [targetUserId_1])];
                case 13:
                    deleteResult = _a.sent();
                    console.log("  \u2705 ".concat(table, ": Deleted ").concat(deleteResult.rowCount, " conflicting branding rows (target user already has branding)"));
                    return [3 /*break*/, 18];
                case 14: return [4 /*yield*/, client.query("SELECT user_id FROM branding ORDER BY updated_at DESC LIMIT 1")];
                case 15:
                    firstBranding = (_a.sent()).rows;
                    if (!(firstBranding.length > 0)) return [3 /*break*/, 18];
                    return [4 /*yield*/, client.query("UPDATE branding SET user_id = $1 WHERE user_id = $2", [targetUserId_1, firstBranding[0].user_id])];
                case 16:
                    _a.sent();
                    console.log("  \u2705 ".concat(table, ": Moved branding from user ").concat(firstBranding[0].user_id, " to user ").concat(targetUserId_1));
                    return [4 /*yield*/, client.query("DELETE FROM branding WHERE user_id != $1", [targetUserId_1])];
                case 17:
                    deleteResult = _a.sent();
                    if (deleteResult.rowCount > 0) {
                        console.log("  \u2705 ".concat(table, ": Deleted ").concat(deleteResult.rowCount, " other branding rows"));
                    }
                    _a.label = 18;
                case 18:
                    totalRowsMoved += rowsToMove;
                    return [3 /*break*/, 22];
                case 19: return [4 /*yield*/, client.query("\n          UPDATE ".concat(table, "\n          SET user_id = $1\n          WHERE user_id != $1\n        "), [targetUserId_1])];
                case 20:
                    updateResult = _a.sent();
                    movedCount = updateResult.rowCount || 0;
                    totalRowsMoved += movedCount;
                    console.log("  \u2705 ".concat(table, ": Reassigned ").concat(movedCount, " rows to user ").concat(targetUserId_1));
                    return [3 /*break*/, 22];
                case 21:
                    error_1 = _a.sent();
                    console.error("  \u274C Error processing ".concat(table, ":"), error_1.message);
                    return [3 /*break*/, 22];
                case 22:
                    _i++;
                    return [3 /*break*/, 8];
                case 23: return [4 /*yield*/, client.query("COMMIT")];
                case 24:
                    _a.sent();
                    console.log("\n" + "=".repeat(60));
                    console.log("✅ ✅ ✅ Content reassignment completed successfully! ✅ ✅ ✅");
                    console.log("=".repeat(60));
                    console.log("\n\uD83D\uDCCA Summary:");
                    console.log("   Target User: ".concat(targetEmail, " (ID: ").concat(targetUserId_1, ")"));
                    console.log("   Total Rows Reassigned: ".concat(totalRowsMoved));
                    console.log("\n\uD83D\uDCA1 All content is now owned by: ".concat(targetEmail));
                    console.log("\n\uD83D\uDCDD Next steps:");
                    console.log("   1. Sign in with ".concat(targetEmail));
                    console.log("   2. Verify all content is visible");
                    console.log("   3. Other users will now see empty systems\n");
                    return [3 /*break*/, 29];
                case 25:
                    error_2 = _a.sent();
                    return [4 /*yield*/, client.query("ROLLBACK")];
                case 26:
                    _a.sent();
                    console.error("\n❌ Content reassignment failed:", error_2);
                    console.error("\nThe database has been rolled back to its previous state.");
                    throw error_2;
                case 27:
                    client.release();
                    return [4 /*yield*/, connection_js_1.default.end()];
                case 28:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 29: return [2 /*return*/];
            }
        });
    });
}
// Check if being run directly
if (import.meta.url === "file://".concat(process.argv[1].replace(/\\/g, '/'))) {
    reassignContent().catch(function (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
exports.default = reassignContent;
