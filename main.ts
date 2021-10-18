// For help writing plugins, visit the documentation to get started:
//   https://support.insomnia.rest/article/173-plugins
import { buildOperationNodeForField } from "@graphql-tools/utils";
import {
  buildClientSchema,
  getIntrospectionQuery,
  print,
  GraphQLSchema,
  OperationDefinitionNode,
  parse,
  GraphQLNamedType,
  VariableDefinitionNode,
  isNamedType,
} from "graphql";

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

export interface Root {
  context: Context;
  spec: Spec;
}

export interface Context {
  app: App;
  __private: Private;
  data: Data;
  store: Store;
  network: Network;
}

export interface App {
  clipboard: Clipboard;
  alert: (title: string, message?: string) => Promise<undefined>;
  prompt: (
    title: string,
    options: {
      label: string;
      defaultValue: string;
      submitName?: string;
      cancelable: boolean;
    }
  ) => Promise<string>;
}

export interface Clipboard {}

export interface Private {
  analytics: Analytics;
}

export interface Analytics {
  SegmentEvent: SegmentEvent;
}

export interface SegmentEvent {
  collectionCreate: string;
  documentCreate: string;
  pluginExportLoadAllWokspace: string;
  pluginExportLoadWorkspacesInProject: string;
  requestCreate: string;
  requestExecute: string;
  projectLocalCreate: string;
  projectLocalDelete: string;
  testSuiteCreate: string;
  testSuiteDelete: string;
  unitTestCreate: string;
  unitTestDelete: string;
  unitTestRun: string;
  unitTestRunAll: string;
}

export interface Data {
  import: Import;
  export: Export;
}

export interface Import {
  raw: (
    text: string,
    options: {
      workspaceId?: string;
      scope?: Scope;
    }
  ) => Promise<void>;
}

export interface Export {}

export interface Store {}

export interface Network {}

export interface Spec {
  requestGroups: any[];
  requests: Request[];
  workspace: Workspace;
}

export interface Request {
  _id: string;
  type: string;
  parentId: string;
  modified: number;
  created: number;
  url: string;
  name: string;
  description: string;
  method: string;
  body: Body;
  parameters: any[];
  headers: any[];
  authentication: Authentication;
  metaSortKey: number;
  isPrivate: boolean;
  settingStoreCookies: boolean;
  settingSendCookies: boolean;
  settingDisableRenderRequestBody: boolean;
  settingEncodeUrl: boolean;
  settingRebuildPath: boolean;
  settingFollowRedirects: string;
}

export interface Body {}

export interface Authentication {}

type Scope = "design" | "document";

type RequestGroup = {
  _id: string;
  name: string;
  parentId: string;
  description: string;
  _type: string;
  environment: Record<string, any>;
  environmentPropertyOrder: Record<string, any> | null;
  metaSortKey: number;
};

type Workspace = {
  _id: string;
  name: string;
  description: string;
  certificates?: any;
  scope: Scope;
};

type WorkspaceAction = {
  action: (
    context: Context,
    models: {
      workspace: Workspace;
      requestGroups: RequestGroup[];
      requests: Request[];
    }
  ) => void | Promise<void>;
  label: string;
  icon?: string;
};

function getCurrentWorkspace(spec: Spec) {
  let workspace = spec.workspace;

  return workspace;
}

async function fetchGraphQLSchema(
  context: Context,
  url: URL
): Promise<GraphQLSchema> {
  let introspectionQuery = getIntrospectionQuery();
  // @ts-ignore
  let axios = context.__private.axios;

  const response = await axios({
    method: "POST",
    url: url.toString(),

    data: JSON.stringify({
      query: introspectionQuery,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return buildClientSchema(response.data.data);
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
    ),
  };
}

async function promptUserForSchemaUrl(context: Context) {
  let schemaUrl: string;
  let url: URL;

  try {
    schemaUrl = await context.app.prompt(
      "Please provide the GraphQL url of your schema",
      {
        cancelable: true,
        defaultValue: "https://rickandmortyapi.com/graphql",
        label: "Import from a GraphQL url",
      }
    );
  } catch (e) {
    console.log(e);
    return;
  }

  try {
    url = new URL(schemaUrl);
  } catch (e) {
    if (e instanceof Error) {
      await context.app.alert(
        "Import from a GraphQL url",
        "The url you provided is not valid"
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
    _id: generateInsomniaId(),
  };

  function mapOperationToRequest(operation: OperationDefinitionNode) {
    return {
      _id: generateInsomniaId(),
      _type: "request",
      body: {
        mimeType: "application/graphql",
        text: JSON.stringify({
          query: print(operation),
          variables: JSON.stringify({}),
        }),
        headers: [
          {
            name: "Content-Type",
            value: "application/json",
          },
        ],
      },
      name: operation.name?.value,
      method: "POST",
      url,
      parentId: requestGroup._id,
    };
  }

  let requests: Partial<Request>[] = operations.map(mapOperationToRequest);

  return [requestGroup, ...requests];
}

export let workspaceActions: WorkspaceAction[] = [
  {
    label: "GraphQL: Generate operations",
    icon: "graph",
    async action(context, spec) {
      let schemaUrl = await promptUserForSchemaUrl(context);
      if (schemaUrl) {
        let schema = await fetchGraphQLSchema(context, schemaUrl);
        let operations = await generateOperations(schema);

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
          workspace,
        ];

        let insomniaExportLike = {
          resources,
          _type: "export",
          __export_format: 4,
        };

        await context.data.import.raw(JSON.stringify(insomniaExportLike), {
          workspaceId: workspace._id,
        });

        context.app.alert(
          "Imported!",
          "Successfully imported GraphQL operations from url"
        );
      }
    },
  },
];
