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
exports.testConnection = testConnection;
/**
 * PostgreSQL connection pool.
 * Uses DATABASE_URL from environment.
 */
var pg_1 = __importDefault(require("pg"));
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var pool = new pg_1.default.Pool({
    connectionString: process.env.DATABASE_URL,
});
// Log unexpected pool errors but don't crash — let the health check handle it
pool.on("error", function (err) {
    console.error("Unexpected PostgreSQL pool error:", err);
});
/**
 * Test DB connection with retries — Railway's Postgres can take a few seconds
 * to accept connections after the backend container starts.
 */
function testConnection() {
    return __awaiter(this, arguments, void 0, function (retries, delayMs) {
        var attempt, client, result, err_1;
        if (retries === void 0) { retries = 5; }
        if (delayMs === void 0) { delayMs = 3000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    attempt = 1;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= retries)) return [3 /*break*/, 11];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 8, , 10]);
                    return [4 /*yield*/, pool.connect()];
                case 3:
                    client = _a.sent();
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, , 6, 7]);
                    return [4 /*yield*/, client.query("SELECT NOW()")];
                case 5:
                    result = _a.sent();
                    console.log("✅ PostgreSQL connected:", result.rows[0].now);
                    return [2 /*return*/];
                case 6:
                    client.release();
                    return [7 /*endfinally*/];
                case 7: return [3 /*break*/, 10];
                case 8:
                    err_1 = _a.sent();
                    if (attempt === retries) {
                        throw new Error("Failed to connect to PostgreSQL after ".concat(retries, " attempts. ") +
                            "Check DATABASE_URL is set correctly.\n".concat(err_1));
                    }
                    console.warn("\u23F3 DB connection attempt ".concat(attempt, "/").concat(retries, " failed \u2014 retrying in ").concat(delayMs / 1000, "s..."));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delayMs); })];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 10:
                    attempt++;
                    return [3 /*break*/, 1];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.default = pool;
