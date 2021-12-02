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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceActions = void 0;
// For help writing plugins, visit the documentation to get started:
//   https://support.insomnia.rest/article/173-plugins
var utils_1 = require("@graphql-tools/utils");
var graphql_1 = require("graphql");
var got_1 = __importDefault(require("got"));
var pluginName = "GraphQL Codegen";
/**
 * NOTE:
 * Insomnia will generate new ids for any resource with an id that matches this regex: /__\w+_\d+__/g;
 * https://github.com/Kong/insomnia/blob/develop/packages/insomnia-app/app/common/import.ts#L110
 */
function insomniaIdGenerator() {
    var index = 0;
    return function generateInsomniaId() {
        index += 1;
        return "__INSOMNIA_" + index + "__";
    };
}
function getCurrentWorkspace(models) {
    var workspace = models.workspace;
    return workspace;
}
function fetchGraphQLSchema(url) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, got_1.default(url.href, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            query: graphql_1.getIntrospectionQuery(),
                        }),
                    }).json()];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, graphql_1.buildClientSchema(res.data)];
            }
        });
    });
}
function mapFieldsToOperations(schema, fields, kind) {
    return fields.map(function (field) {
        var operationNode = utils_1.buildOperationNodeForField({ schema: schema, kind: kind, field: field });
        operationNode.name.value = field;
        return operationNode;
    });
}
function generateOperations(schema) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var mutations, queries, subscriptions;
        return __generator(this, function (_d) {
            mutations = ((_a = schema.getMutationType()) === null || _a === void 0 ? void 0 : _a.getFields()) || [];
            queries = ((_b = schema.getQueryType()) === null || _b === void 0 ? void 0 : _b.getFields()) || [];
            subscriptions = ((_c = schema.getSubscriptionType()) === null || _c === void 0 ? void 0 : _c.getFields()) || [];
            return [2 /*return*/, {
                    mutations: mapFieldsToOperations(schema, Object.keys(mutations), "mutation"),
                    queries: mapFieldsToOperations(schema, Object.keys(queries), "query"),
                    subscriptions: mapFieldsToOperations(schema, Object.keys(subscriptions), "subscription")
                }];
        });
    });
}
function promptUserForSchemaUrlFromFile(context) {
    return __awaiter(this, void 0, void 0, function () {
        var schemaUrl, url, e_1, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.app.prompt(pluginName + ": Import from File", {
                            cancelable: true,
                            defaultValue: "http://localhost:4000/graphql",
                            label: "Provide the Url for the generated GraphQL requests"
                        })];
                case 1:
                    schemaUrl = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    console.log(e_1);
                    return [2 /*return*/];
                case 3:
                    _a.trys.push([3, 4, , 7]);
                    url = new URL(schemaUrl);
                    return [2 /*return*/, url];
                case 4:
                    e_2 = _a.sent();
                    if (!(e_2 instanceof Error)) return [3 /*break*/, 6];
                    return [4 /*yield*/, context.app.alert(pluginName + ": Import from File", "The Url is not valid")];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function promptUserForSchemaUrl(context) {
    return __awaiter(this, void 0, void 0, function () {
        var schemaUrl, url, e_3, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, context.app.prompt(pluginName + ": Import from Url", {
                            cancelable: true,
                            defaultValue: "",
                            label: "Please provide the Url of your GraphQL API"
                        })];
                case 1:
                    schemaUrl = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_3 = _a.sent();
                    console.log(e_3);
                    return [2 /*return*/];
                case 3:
                    _a.trys.push([3, 4, , 7]);
                    url = new URL(schemaUrl);
                    return [2 /*return*/, url];
                case 4:
                    e_4 = _a.sent();
                    if (!(e_4 instanceof Error)) return [3 /*break*/, 6];
                    return [4 /*yield*/, context.app.alert(pluginName + ": Import from Url", "The Url is not valid")];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
var generateInsomniaId = insomniaIdGenerator();
function getInsomniaRequestGroupFromOperations(operations, workspaceId, url, operationGroupName) {
    if (operations.length === 0)
        return [];
    var requestGroup = {
        parentId: workspaceId,
        name: operationGroupName,
        _type: "request_group",
        _id: generateInsomniaId()
    };
    function mapOperationToRequest(operation) {
        var _a;
        return {
            _id: generateInsomniaId(),
            _type: "request",
            body: {
                mimeType: "application/graphql",
                text: JSON.stringify({
                    query: graphql_1.print(operation),
                    variables: JSON.stringify({})
                }),
                headers: [
                    {
                        name: "Content-Type",
                        value: "application/json"
                    }
                ]
            },
            name: (_a = operation.name) === null || _a === void 0 ? void 0 : _a.value,
            method: "POST",
            url: url,
            parentId: requestGroup._id
        };
    }
    var requests = operations.map(mapOperationToRequest);
    return __spreadArray([requestGroup], requests);
}
/**
 * Transforms the operations to requests and imports them to the current workspace.
 */
function importToCurrentWorkspace(models, operations, schemaUrl, context) {
    return __awaiter(this, void 0, void 0, function () {
        var workspace, subscriptionsRequestGroup, queriesRequestGroup, mutationsRequestGroup, resources, insomniaExportLike;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    workspace = getCurrentWorkspace(models);
                    subscriptionsRequestGroup = getInsomniaRequestGroupFromOperations(operations.subscriptions, workspace._id, schemaUrl.toString(), "Subscriptions");
                    queriesRequestGroup = getInsomniaRequestGroupFromOperations(operations.queries, workspace._id, schemaUrl.toString(), "Queries");
                    mutationsRequestGroup = getInsomniaRequestGroupFromOperations(operations.mutations, workspace._id, schemaUrl.toString(), "Mutations");
                    resources = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], subscriptionsRequestGroup), queriesRequestGroup), mutationsRequestGroup), [
                        workspace
                    ]);
                    insomniaExportLike = {
                        resources: resources,
                        _type: "export",
                        __export_format: 4
                    };
                    return [4 /*yield*/, context.data.import.raw(JSON.stringify(insomniaExportLike), {
                            workspaceId: workspace._id
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var importToCurrentWorkspaceFromUrl = function importToCurrentWorkspaceFromUrl(context, models) {
    return __awaiter(this, void 0, void 0, function () {
        var schemaUrl, schema, operations, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, promptUserForSchemaUrl(context)];
                case 1:
                    schemaUrl = _a.sent();
                    if (!schemaUrl) return [3 /*break*/, 5];
                    return [4 /*yield*/, fetchGraphQLSchema(schemaUrl)];
                case 2:
                    schema = _a.sent();
                    return [4 /*yield*/, generateOperations(schema)];
                case 3:
                    operations = _a.sent();
                    return [4 /*yield*/, importToCurrentWorkspace(models, operations, schemaUrl, context)];
                case 4:
                    _a.sent();
                    context.app.alert(pluginName + ": Import from Url", "Successfully imported GraphQL operations from Url");
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    if (error_1 instanceof Error) {
                        console.log("[ERROR] [" + pluginName + ": From Url] [" + error_1 + "]");
                        context.app.alert("Error while importing GraphQL operations", error_1.message);
                    }
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
};
var importToCurrentWorkspaceFromFile = function importToCurrentWorkspaceFromFile(context, spec) {
    return __awaiter(this, void 0, void 0, function () {
        var fileHandle, file, contents, schema, operations, schemaUrl, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, window.showOpenFilePicker()];
                case 1:
                    fileHandle = (_a.sent())[0];
                    return [4 /*yield*/, fileHandle.getFile()];
                case 2:
                    file = _a.sent();
                    return [4 /*yield*/, file.text()];
                case 3:
                    contents = _a.sent();
                    schema = graphql_1.buildSchema(contents);
                    return [4 /*yield*/, generateOperations(schema)];
                case 4:
                    operations = _a.sent();
                    return [4 /*yield*/, promptUserForSchemaUrlFromFile(context)];
                case 5:
                    schemaUrl = _a.sent();
                    return [4 /*yield*/, importToCurrentWorkspace(spec, operations, schemaUrl || new URL("https://localhost:4000"), context)];
                case 6:
                    _a.sent();
                    context.app.alert(pluginName + ": From File", "Successfully imported GraphQL operations from url!");
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _a.sent();
                    if (error_2 instanceof Error) {
                        console.log("[ERROR] [" + pluginName + ": From File] [" + error_2 + "]");
                        context.app.alert("Error while importing GraphQL operations", error_2.message);
                    }
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
};
/**
 * Insomnia uses this exported key to add workspace actions from plugins
 */
exports.workspaceActions = [
    {
        label: pluginName + ": From Url",
        action: importToCurrentWorkspaceFromUrl
    },
    {
        label: pluginName + ": From File",
        action: importToCurrentWorkspaceFromFile
    }
];
