import * as vscode from "vscode";
import {
    MediaGraphInstance,
    MediaGraphInstanceState,
    MediaGraphTopology
} from "../../Common/Types/LVASDKTypes";
import { GraphInstanceData } from "../Data/GraphInstanceData";
import { IotHubData } from "../Data/IotHubData";
import { Constants } from "../Util/Constants";
import { LvaHubConfig } from "../Util/ExtensionUtils";
import Localizer from "../Util/Localizer";
import { Logger } from "../Util/Logger";
import { TreeUtils } from "../Util/TreeUtils";
import { GraphEditorPanel } from "../Webview/GraphPanel";
import { INode } from "./Node";

export class InstanceItem extends vscode.TreeItem {
    private _logger: Logger;

    constructor(
        public iotHubData: IotHubData,
        public readonly deviceId: string,
        public readonly moduleId: string,
        private readonly _graphTopology: MediaGraphTopology,
        private readonly _graphInstance?: MediaGraphInstance,
        private _nameCheckCallback?: (name: string) => boolean
    ) {
        super(_graphInstance?.name ?? Localizer.localize("createGraphInstanceButton"), vscode.TreeItemCollapsibleState.None);
        this._logger = Logger.getOrCreateOutputChannel();
        if (_graphInstance) {
            switch (_graphInstance.properties?.state) {
                case MediaGraphInstanceState.Active:
                    this.contextValue = "InstanceItemContextActive";
                    this.iconPath = TreeUtils.getIconPath(`Graph-Instance-Active`);
                    break;
                case MediaGraphInstanceState.Inactive:
                    this.contextValue = "InstanceItemContextInactive";
                    this.iconPath = TreeUtils.getIconPath(`Graph-Instance-Inactive`);
                    break;
                default:
                    this.contextValue = "InstanceItemContextProgress";
                    this.iconPath = TreeUtils.getIconPath(`Graph-Instance-Inactive`);
            }
        } else {
            this.iconPath = new vscode.ThemeIcon("add");
            this.command = { title: Localizer.localize("createGraphInstanceButton"), command: "moduleExplorer.createInstance", arguments: [this] };
        }
    }

    public getChildren(lvaHubConfig: LvaHubConfig): Promise<INode[]> | INode[] {
        return [];
    }

    public editInstanceCommand(context: vscode.ExtensionContext) {
        const logger = Logger.getOrCreateOutputChannel();
        const createGraphPanel = GraphEditorPanel.createOrShow(context.extensionPath, Localizer.localize("editInstancePageTile"));
        if (createGraphPanel) {
            createGraphPanel.waitForPostMessage({
                name: Constants.PostMessageNames.closeWindow,
                callback: () => {
                    createGraphPanel.dispose();
                }
            });

            createGraphPanel.setupInitialMessage({ pageType: Constants.PageTypes.instancePage, graphData: this._graphTopology, graphInstance: this._graphInstance });

            createGraphPanel.setupNameCheckMessage((name) => {
                return this._nameCheckCallback == null || this._nameCheckCallback(name);
            });

            createGraphPanel.waitForPostMessage({
                name: Constants.PostMessageNames.saveGraph,
                callback: async (instance: any) => {
                    this.saveGraph(createGraphPanel, instance);
                }
            });
            createGraphPanel.waitForPostMessage({
                name: Constants.PostMessageNames.saveAndActivate,
                callback: async (instance: MediaGraphInstance) => {
                    this.saveGraph(createGraphPanel, instance).then(() => {
                        return this.activateInstanceCommand(instance.name);
                    });
                }
            });
        }
    }

    public saveGraph(createGraphPanel: GraphEditorPanel, instance: MediaGraphInstance) {
        return GraphInstanceData.putGraphInstance(this.iotHubData, this.deviceId, this.moduleId, instance).then(
            (response) => {
                TreeUtils.refresh();
                createGraphPanel.dispose();
            },
            (error) => {
                this._logger.logError(`Failed to save the instance "${this._graphInstance?.name}"`, error); // TODO. localize
            }
        );
    }

    public activateInstanceCommand(graphInstanceName?: string) {
        const instanceName = graphInstanceName || this._graphInstance?.name;
        if (instanceName) {
            GraphInstanceData.activateGraphInstance(this.iotHubData, this.deviceId, this.moduleId, instanceName).then(
                (response) => {
                    TreeUtils.refresh();
                },
                (error) => {
                    this._logger.logError(`Failed to activate the instance "${instanceName}"`, error); // TODO. localize
                }
            );
        }
    }

    public deactivateInstanceCommand() {
        if (this._graphInstance) {
            GraphInstanceData.deactivateGraphInstance(this.iotHubData, this.deviceId, this.moduleId, this._graphInstance.name).then(
                (response) => {
                    TreeUtils.refresh();
                },
                (error) => {
                    this._logger.logError(`Failed to deactivate the instance "${this._graphInstance?.name}"`, error); // TODO. localize
                }
            );
        }
    }

    public deleteInstanceCommand() {
        if (this._graphInstance) {
            // TODO we might need a confirmation before delete
            GraphInstanceData.deleteGraphInstance(this.iotHubData, this.deviceId, this.moduleId, this._graphInstance.name).then(
                (response) => {
                    TreeUtils.refresh();
                },
                (error) => {
                    this._logger.logError(`Failed to delete the instance "${this._graphInstance?.name}"`, error); // TODO. localize
                }
            );
        }
    }
}
