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
  buildSchema,
  OperationTypeNode
} from "graphql";

import https from "https";
import http from "http";
import {
  WorkspaceActionModels,
  Context,
  Request,
  RequestGroup,
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

function getCurrentWorkspace(models: WorkspaceActionModels) {
  let workspace = models.workspace;

  return workspace;
}

async function fetchGraphQLSchema(url: URL): Promise<GraphQLSchema> {
  let introspectionQuery = getIntrospectionQuery();

  return new Promise((resolve, reject) => {
    let { request: httpRequest, Agent } =
      url.protocol === "https:" ? https : http;

    let request = httpRequest(
      {
        method: "POST",
        protocol: url.protocol,
        host: url.host,
        path: url.pathname,
        pathname: url.pathname,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        agent: new Agent({
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
  kind: OperationTypeNode
) {
  return fields.map((field) =>
    buildOperationNodeForField({
      schema,
      kind,
      field: field,
      depthLimit: 1,
      circularReferenceDepth: 0
    })
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
      OperationTypeNode.MUTATION
    ),
    queries: mapFieldsToOperations(
      schema,
      Object.keys(queries),
      OperationTypeNode.QUERY
    ),
    subscriptions: mapFieldsToOperations(
      schema,
      Object.keys(subscriptions),
      OperationTypeNode.SUBSCRIPTION
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
    return url;
  } catch (e) {
    if (e instanceof Error) {
      await context.app.alert(
        `${pluginName}: Import from File`,
        "The Url is not valid"
      );
    }
  }
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
    if (!schemaUrl.startsWith("http") || !schemaUrl.startsWith("https")) {
      schemaUrl = `http://${schemaUrl}`;
    }

    url = new URL(schemaUrl);
    return url;
  } catch (e) {
    if (e instanceof Error) {
      await context.app.alert(
        `${pluginName}: Import from Url`,
        "The Url is not valid"
      );
    }
  }
}

let generateInsomniaId = insomniaIdGenerator();

function getInsomniaResourcesFromOperations(
  operations: OperationDefinitionNode[],
  workspaceId: string,
  url: string,
  operationGroupName: string
) {
  if (operations.length === 0) return [];

  let requestGroup: Partial<RequestGroup & { _type: "request_group" }> = {
    parentId: workspaceId,
    name: operationGroupName,
    _type: "request_group",
    _id: generateInsomniaId()
  };

  function mapOperationToRequest(
    operation: OperationDefinitionNode
  ): Partial<Request & { _type: "request" }> {
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
  models: WorkspaceActionModels,
  operations: {
    mutations: OperationDefinitionNode[];
    queries: OperationDefinitionNode[];
    subscriptions: OperationDefinitionNode[];
  },
  schemaUrl: URL,
  context: Context
) {
  let workspace = getCurrentWorkspace(models);

  let subscriptionsRequestGroup = getInsomniaResourcesFromOperations(
    operations.subscriptions,
    workspace._id,
    schemaUrl.toString(),
    "Subscriptions"
  );

  let queriesRequestGroup = getInsomniaResourcesFromOperations(
    operations.queries,
    workspace._id,
    schemaUrl.toString(),
    "Queries"
  );

  let mutationsRequestGroup = getInsomniaResourcesFromOperations(
    operations.mutations,
    workspace._id,
    schemaUrl.toString(),
    "Mutations"
  );

  async function importResources(resources: any[]) {
    let insomniaExportLike = {
      resources,
      _type: "export",
      __export_format: 4
    };

    await context.data.import.raw(JSON.stringify(insomniaExportLike), {
      workspaceId: workspace._id
    });
  }

  let requestGroups = [
    subscriptionsRequestGroup,
    queriesRequestGroup,
    mutationsRequestGroup,
  ];

  for (let requestGroup of requestGroups) {
    await importResources(requestGroup);
  }
}

let importToCurrentWorkspaceFromUrl: WorkspaceAction["action"] =
  async function importToCurrentWorkspaceFromUrl(context, models) {
    try {
      let schemaUrl = await promptUserForSchemaUrl(context);
      if (schemaUrl) {
        let schema = await fetchGraphQLSchema(schemaUrl);
        let operations = await generateOperations(schema);

        await importToCurrentWorkspace(models, operations, schemaUrl, context);

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
    action: importToCurrentWorkspaceFromUrl
  },
  {
    label: `${pluginName}: From File`,
    action: importToCurrentWorkspaceFromFile
  }
];
