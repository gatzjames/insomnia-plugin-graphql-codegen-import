import { AxiosInstance } from "axios";

declare module "insomnia-plugin" {
  export interface AppClipboard {
    readText(): string;
    writeText(text: string): void;
    clear(): void;
  }

  export interface Analytics {
    SegmentEvent: SegmentEvent;
  }

  export interface Private {
    analytics: Analytics;
    axios: AxiosInstance["request"];
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

  export interface Context {
    app: AppContext;
    data: DataContext;
    store: StoreContext;
    network: NetworkContext;
    /** Private properties */
    __private: Private;
  }

  export interface Spec {
    requestGroups: any[];
    requests: Request[];
    workspace: Workspace;
  }

  export interface Body {}
  export interface Request {
    _id: string;
    type: "request";
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

  export interface Authentication {}

  type Scope = "design" | "document";

  type RequestGroup = {
    _id: string;
    name: string;
    parentId: string;
    description: string;
    type: "request_group";
    environment: Record<string, any>;
    environmentPropertyOrder: Record<string, any> | null;
    metaSortKey: number;
  };

  type Workspace = {
    _id: string;
    name: string;
    type: "workspace";
    description: string;
    certificates?: any;
    scope: Scope;
  };

  // Insomnia Plugin Types
  interface RequestContext {
    getId(): string;
    getName(): string;
    getUrl(): string;
    setUrl(url: string): void;
    getMethod(): string;
    setMethod(method: string): void;
    getHeaders(): Array<{ name: string; value: string }>;
    getHeader(name: string): string | null;
    hasHeader(name: string): boolean;
    removeHeader(name: string): void;
    setHeader(name: string, value: string): void;
    addHeader(name: string, value: string): void;
    getParameter(name: string): string | null;
    getParameters(): Array<{ name: string; value: string }>;
    setParameter(name: string, value: string): void;
    hasParameter(name: string): boolean;
    addParameter(name: string, value: string): void;
    removeParameter(name: string): void;
    getBody(): Object;
    setBody(body: Object): void;
    getEnvironmentVariable(name: string): any;
    getEnvironment(): Object;
    setAuthenticationParameter(name: string, value: string): void;
    getAuthentication(): Object;
    setCookie(name: string, value: string): void;
    settingSendCookies(enabled: boolean): void;
    settingStoreCookies(enabled: boolean): void;
    settingEncodeUrl(enabled: boolean): void;
    settingDisableRenderRequestBody(enabled: boolean): void;
    settingFollowRedirects(enabled: boolean): void;
  }

  interface ResponseContext {
    getRequestId(): string;
    getStatusCode(): number;
    getStatusMessage(): string;
    getBytesRead(): number;
    getTime(): number;
    getBody(): Buffer | null;
    getBodyStream(): ReadableStream;
    setBody(body: Buffer): void;
    getHeader(name: string): string | Array<string> | null;
    getHeaders(): Array<{ name: string; value: string }> | undefined;
    hasHeader(name: string): boolean;
  }

  interface StoreContext {
    hasItem(key: string): Promise<boolean>;
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    all(): Promise<Array<{ key: string; value: string }>>;
  }

  interface AppContext {
    alert(title: string, message?: string): Promise<void>;

    dialog(
      title: string,
      body: HTMLElement,
      options?: {
        onHide?: () => void;
        tall?: boolean;
        skinny?: boolean;
        wide?: boolean;
      }
    ): void;

    prompt(
      title: string,
      options?: {
        label?: string;
        defaultValue?: string;
        submitName?: string;
        cancelable?: boolean;
      }
    ): Promise<string>;

    getPath(name: string): string;

    showSaveDialog(options?: { defaultPath?: string }): Promise<string | null>;
  }

  interface ImportOptions {
    workspaceId?: string;
    workspaceScope?: Scope;
  }

  interface DataContext {
    import: {
      uri(uri: string, options?: ImportOptions): Promise<void>;
      raw(text: string, options?: ImportOptions): Promise<void>;
    };
    export: {
      insomnia(options?: {
        includePrivate?: boolean;
        format?: "json" | "yaml";
      }): Promise<string>;
      har(options?: { includePrivate?: boolean }): Promise<string>;
    };
  }

  interface NetworkContext {
    sendRequest(request: Request): Promise<Response>;
  }

  interface RenderContext {
    // API not finalized yet
  }

  interface TemplateTag {
    name: string;
    // displayName: DisplayName;
    disablePreview?: () => boolean;
    description?: string;
    deprecated?: boolean;
    liveDisplayName?: (args) => string | undefined;
    validate?: (value: any) => string | undefined;
    priority?: number;
    args: Array<{
      displayName: string;
      description?: string;
      defaultValue: string | number | boolean;
      type: "string" | "number" | "enum" | "model" | "boolean";

      // Only type === 'string'
      placeholder?: string;

      // Only type === 'model'
      modelType: string;

      // Only type === 'enum'
      options: Array<{
        displayName: string;
        value: string;
        description?: string;
        placeholder?: string;
      }>;
    }>;
    actions: Array<{
      name: string;
      icon?: string;
      run?: (context: AppContext) => Promise<void>;
    }>;
  }

  interface RequestHook {
    app: AppContext;
    request: Request;
  }

  interface ResponseHook {
    app: AppContext;
    response: Response;
  }

  interface RequestAction {
    label: string;
    action: (
      context: Context,
      models: {
        requestGroup: RequestGroup;
        request: Request;
      }
    ) => void | Promise<void>;
    icon?: string;
  }

  interface RequestGroupAction {
    label: string;
    action: (
      context: Context,
      models: {
        requestGroup: RequestGroup;
        requests: Array<Request>;
      }
    ) => Promise<void>;
  }

  export interface WorkspaceActionModels {
    workspace: Workspace;
    requestGroups: RequestGroup[];
    requests: Request[];
  }

  interface WorkspaceAction {
    label: string;
    action: (context: Context, models: WorkspaceActionModels) => Promise<void>;
  }

  interface SpecInfo {
    contents: Record<string, any>;
    rawContents: string;
    format: string;
    formatVersion: string;
  }

  interface DocumentAction {
    label: string;
    action: (context: Context, spec: SpecInfo) => void | Promise<void>;
    hideAfterClick?: boolean;
  }

  interface ConfigGenerator {
    label: string;
    generate: (
      info: SpecInfo
    ) => Promise<{ document?: string; error?: string }>;
  }
}
