import { Dialog } from "@playwright/test";
import { AxiosInstance } from "axios";

declare module "insomnia-plugin" {
  export interface Alert {
    (title: string, message?: string): Promise<undefined>;
  }

  export interface Prompt {
    (
      title: string,
      options: {
        label: string;
        defaultValue: string;
        submitName?: string;
        cancelable: boolean;
      }
    ): Promise<string>;
  }

  export interface DialogOptions {
    onHide?: () => void;
    tall?: boolean;
    skinny?: boolean;
    wide?: boolean;
  }

  export interface Dialog {
    (title: string, body: HTMLElement, options?: DialogOptions): void;
  }

  export interface AppInfo {
    version: string;
    platform: NodeJS.Platform;
  }

  export interface ShowDialogOptions {
    defaultPath?: string;
  }

  export interface SaveDialog {
    (options?: ShowDialogOptions): Promise<string | null>;
  }

  export interface AppClipboard {
    readText(): string;
    writeText(text: string): void;
    clear(): void;
  }

  export interface ShowGenericModalDialogOptions {
    html?: string;
  }

  export interface ShowGenericModalDialog {
    (title: string, options?: ShowGenericModalDialogOptions): void;
  }

  export interface App {
    alert: Alert;
    dialog: Dialog;
    prompt: Prompt;
    getPath: (name: string) => string;
    getInfo: () => AppInfo;
    showSaveDialog: ShowDialogOptions;
    clipboard: AppClipboard;
    /**
     * @deprecated as it was never officially supported
     */
    showGenericModalDialog: ShowGenericModalDialog;
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

  export interface Data {
    import: Import;
    export: Export;
  }

  export interface Store {}

  export interface Network {}

  export interface Context {
    app: App;
    data: Data;
    store: Store;
    network: Network;
    /** Private properties */
    __private: Private;
  }

  export interface Spec {
    requestGroups: any[];
    requests: Request[];
    workspace: Workspace;
  }

  export interface Request {
    _id: string;
    _type: string;
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

  export interface Action {
    (
      context: Context,
      models: {
        workspace: Workspace;
        requestGroups: RequestGroup[];
        requests: Request[];
      }
    ): void | Promise<void>;
  }

  type WorkspaceAction = {
    action: Action;
    label: string;
    icon?: string;
    hideAfterClick?: boolean;
  };
}
