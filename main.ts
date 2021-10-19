// For help writing plugins, visit the documentation to get started:
//   https://support.insomnia.rest/article/173-plugins
import { buildOperationNodeForField } from "@graphql-tools/utils";
import {
  buildClientSchema,
  getIntrospectionQuery,
  print,
  GraphQLSchema,
  OperationDefinitionNode,
  IntrospectionQuery,
  buildSchema
} from "graphql";

import https from "https";
import {
  Context,
  Request,
  RequestGroup,
  Spec,
  WorkspaceAction
} from "insomnia-plugin";

let pluginName = `GraphQL Codegen`;

/**
 * NOTE:
 * Insomnia will generate new ids for any resource with an id that matches this regex: /__\w+_\d+__/g;
 * https://github.com/Kong/insomnia/blob/develop/packages/insomnia-app/app/common/import.ts#L110
 */
function insomniaIdGenerator() {
  let index = 0;

  return function generateInsomniaId() {
    index += 1;
    return `__INSOMNIA_${index}__`;
  };
}

function getCurrentWorkspace(spec: Spec) {
  let workspace = spec.workspace;

  return workspace;
}

async function fetchGraphQLSchema(url: URL): Promise<GraphQLSchema> {
  let introspectionQuery = getIntrospectionQuery();

  return new Promise((resolve, reject) => {
    let request = https.request(
      {
        method: "POST",
        protocol: "https:",
        host: url.host,
        path: url.pathname,
        pathname: url.pathname,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        agent: new https.Agent({
          rejectUnauthorized: false
        })
      },
      (response) => {
        if (
          response.statusMessage === "OK" ||
          response.statusCode?.toString().startsWith("2")
        ) {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });
          response.on("end", () => {
            let introspectionResult: IntrospectionQuery =
              JSON.parse(data)?.data;
            let schema = buildClientSchema(introspectionResult);
            resolve(schema);
          });
        }

        response.on("error", reject);
      }
    );

    request.on("error", reject);
    request.write(JSON.stringify({ query: introspectionQuery }));
    request.end();
  });
}

function mapFieldsToOperations(
  schema: GraphQLSchema,
  fields: string[],
  kind: "query" | "mutation" | "subscription"
) {
  return fields.map((field) =>
    buildOperationNodeForField({ schema, kind, field: field })
  );
}

async function generateOperations(schema: GraphQLSchema) {
  let mutations = schema.getMutationType()?.getFields() || [];

  let queries = schema.getQueryType()?.getFields() || [];
  let subscriptions = schema.getSubscriptionType()?.getFields() || [];

  return {
    mutations: mapFieldsToOperations(
      schema,
      Object.keys(mutations),
      "mutation"
    ),
    queries: mapFieldsToOperations(schema, Object.keys(queries), "query"),
    subscriptions: mapFieldsToOperations(
      schema,
      Object.keys(subscriptions),
      "subscription"
    )
  };
}

async function promptUserForSchemaUrlFromFile(context: Context) {
  let schemaUrl: string;
  let url: URL;

  try {
    schemaUrl = await context.app.prompt(`${pluginName}: Import from File`, {
      cancelable: true,
      defaultValue: "http://localhost:4000/graphql",
      label: "Provide the Url for the generated GraphQL requests"
    });
  } catch (e) {
    console.log(e);
    return;
  }

  try {
    url = new URL(schemaUrl);
  } catch (e) {
    if (e instanceof Error) {
      await context.app.alert(
        `${pluginName}: Import from File`,
        "The Url is not valid"
      );
    }
  }

  return url;
}

async function promptUserForSchemaUrl(context: Context) {
  let schemaUrl: string;
  let url: URL;

  try {
    schemaUrl = await context.app.prompt(`${pluginName}: Import from Url`, {
      cancelable: true,
      defaultValue: "https://rickandmortyapi.com/graphql",
      label: "Please provide the Url of your GraphQL API"
    });
  } catch (e) {
    console.log(e);
    return;
  }

  try {
    url = new URL(schemaUrl);
  } catch (e) {
    if (e instanceof Error) {
      await context.app.alert(
        `${pluginName}: Import from Url`,
        "The Url is not valid"
      );
    }
  }

  return url;
}

let generateInsomniaId = insomniaIdGenerator();

function getInsomniaRequestGroupFromOperations(
  operations: OperationDefinitionNode[],
  workspaceId: string,
  url: string,
  operationGroupName: string
) {
  if (operations.length === 0) return [];

  let requestGroup: Partial<RequestGroup> = {
    parentId: workspaceId,
    name: operationGroupName,
    _type: "request_group",
    _id: generateInsomniaId()
  };

  function mapOperationToRequest(
    operation: OperationDefinitionNode
  ): Partial<Request> {
    return {
      _id: generateInsomniaId(),
      _type: "request",
      body: {
        mimeType: "application/graphql",
        text: JSON.stringify({
          query: print(operation),
          variables: JSON.stringify({})
        }),
        headers: [
          {
            name: "Content-Type",
            value: "application/json"
          }
        ]
      },
      name: operation.name?.value,
      method: "POST",
      url,
      parentId: requestGroup._id
    };
  }

  let requests: Partial<Request>[] = operations.map(mapOperationToRequest);

  return [requestGroup, ...requests];
}

/**
 * Transforms the operations to requests and imports them to the current workspace.
 */
async function importToCurrentWorkspace(
  spec: Spec,
  operations: {
    mutations: OperationDefinitionNode[];
    queries: OperationDefinitionNode[];
    subscriptions: OperationDefinitionNode[];
  },
  schemaUrl: URL,
  context: Context
) {
  let workspace = getCurrentWorkspace(spec);

  let subscriptionsRequestGroup = getInsomniaRequestGroupFromOperations(
    operations.subscriptions,
    workspace._id,
    schemaUrl.toString(),
    "Subscriptions"
  );

  let queriesRequestGroup = getInsomniaRequestGroupFromOperations(
    operations.queries,
    workspace._id,
    schemaUrl.toString(),
    "Queries"
  );

  let mutationsRequestGroup = getInsomniaRequestGroupFromOperations(
    operations.mutations,
    workspace._id,
    schemaUrl.toString(),
    "Mutations"
  );

  let resources = [
    ...subscriptionsRequestGroup,
    ...queriesRequestGroup,
    ...mutationsRequestGroup,
    workspace
  ];

  let insomniaExportLike = {
    resources,
    _type: "export",
    __export_format: 4
  };

  await context.data.import.raw(JSON.stringify(insomniaExportLike), {
    workspaceId: workspace._id
  });
}

let importToCurrentWorkspaceFromUrl: WorkspaceAction["action"] =
  async function importToCurrentWorkspaceFromUrl(context, spec) {
    try {
      let schemaUrl = await promptUserForSchemaUrl(context);
      if (schemaUrl) {
        let schema = await fetchGraphQLSchema(schemaUrl);
        let operations = await generateOperations(schema);

        await importToCurrentWorkspace(spec, operations, schemaUrl, context);

        context.app.alert(
          `${pluginName}: Import from Url`,
          "Successfully imported GraphQL operations from Url"
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(`[ERROR] [${pluginName}: From Url] [${error}]`);
        context.app.alert(
          "Error while importing GraphQL operations",
          error.message
        );
      }
    }
  };

let importToCurrentWorkspaceFromFile: WorkspaceAction["action"] =
  async function importToCurrentWorkspaceFromFile(context, spec) {
    try {
      // @ts-ignore This is available in Chrome as the File System Access API
      // https://web.dev/file-system-access/
      let [fileHandle] = await window.showOpenFilePicker();

      let file = await fileHandle.getFile();

      let contents = await file.text();

      let schema = buildSchema(contents);

      let operations = await generateOperations(schema);
      let schemaUrl = await promptUserForSchemaUrlFromFile(context);

      await importToCurrentWorkspace(
        spec,
        operations,
        schemaUrl || new URL("https://localhost:4000"),
        context
      );

      context.app.alert(
        `${pluginName}: From File`,
        "Successfully imported GraphQL operations from url!"
      );
    } catch (error) {
      if (error instanceof Error) {
        console.log(`[ERROR] [${pluginName}: From File] [${error}]`);
        context.app.alert(
          "Error while importing GraphQL operations",
          error.message
        );
      }
    }
  };

/**
 * Insomnia uses this exported key to add workspace actions from plugins
 */
export let workspaceActions: WorkspaceAction[] = [
  {
    label: `${pluginName}: From Url`,
    hideAfterClick: true,
    action: importToCurrentWorkspaceFromUrl
  },
  {
    label: `${pluginName}: From File`,
    hideAfterClick: true,
    action: importToCurrentWorkspaceFromFile
  }
];
