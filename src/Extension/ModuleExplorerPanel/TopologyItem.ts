import * as vscode from "vscode";
import {
    LivePipeline,
    PipelineTopology
} from "../../Common/Types/VideoAnalyzerSDKTypes";
import { IotHubData } from "../Data/IotHubData";
import { TopologyData } from "../Data/TolologyData";
import { Constants } from "../Util/Constants";
import { ExtensionUtils } from "../Util/ExtensionUtils";
import Localizer from "../Util/Localizer";
import { Logger } from "../Util/Logger";
import { TreeUtils } from "../Util/TreeUtils";
import { GraphEditorPanel } from "../Webview/GraphPanel";
import { LivePipelineItem } from "./LivePipelineItem";
import { ModuleDetails } from "./ModuleItem";
import { INode } from "./Node";

export class TopologyItem extends vscode.TreeItem {
    private _logger: Logger;
    private _instanceList: LivePipelineItem[] = [];
    constructor(
        public iotHubData: IotHubData,
        private readonly _moduleDetails: ModuleDetails,
        private readonly _graphTopology?: PipelineTopology,
        private readonly _graphInstances?: LivePipeline[],
        private _nameCheckCallback?: (name: string) => boolean
    ) {
        super(_graphTopology?.name ?? "", vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = TreeUtils.getIconPath(`graph`);
        this._logger = Logger.getOrCreateOutputChannel();

        if (this._graphTopology && this._graphInstances) {
            const instanceItems =
                this._graphInstances
                    .filter((instance) => {
                        return instance?.properties?.topologyName === this._graphTopology?.name;
                    })
                    .map((instance) => {
                        return new LivePipelineItem(this.iotHubData, this._moduleDetails, this._graphTopology!, instance);
                    }) ?? [];
            if (instanceItems.length === 0) {
                this.collapsibleState = vscode.TreeItemCollapsibleState.None;
            }
            this._instanceList.push(...instanceItems);
        }
        const contextPrefix = this._moduleDetails.legacyModule ? "graph" : "topology";
        this.contextValue = contextPrefix + (this._instanceList?.length ? "ItemContextInUse" : "ItemContext");
    }

    public getChildren(): Promise<INode[]> | INode[] {
        return this._instanceList;
    }

    public setGraphCommand(context: vscode.ExtensionContext) {
        const pageTitle = this._moduleDetails.legacyModule
            ? this._graphTopology
                ? "editGraphPageTile"
                : "createNewGraphPageTile"
            : this._graphTopology
            ? "topology.edit.pageTitle"
            : "topology.new.pageTitle";
        const createGraphPanel = GraphEditorPanel.createOrShow(context, Localizer.localize(pageTitle), this._moduleDetails);
        if (createGraphPanel) {
            createGraphPanel.waitForPostMessage({
                name: Constants.PostMessageNames.closeWindow,
                callback: () => {
                    createGraphPanel.dispose();
                }
            });

            createGraphPanel.setupInitialMessage({
                pageType: Constants.PageTypes.graphPage,
                isHorizontal: createGraphPanel.isGraphAlignedToHorizontal(context),
                graphData: this._graphTopology,
                editMode: !!this._graphTopology
            });

            createGraphPanel.setupNameCheckMessage((name) => {
                return this._nameCheckCallback == null || this._nameCheckCallback(name);
            });

            createGraphPanel.waitForPostMessage({
                name: Constants.PostMessageNames.saveGraph,
                callback: async (topology: PipelineTopology) => {
                    TopologyData.putTopology(this.iotHubData, this._moduleDetails, topology).then(
                        (response) => {
                            TreeUtils.refresh();
                            createGraphPanel.dispose();
                            this._logger.showInformationMessage(
                                `${Localizer.localize(this._moduleDetails.legacyModule ? "saveGraphSuccessMessage" : "topology.save.successMessage")} "${topology.name}"`
                            );
                        },
                        (error) => {
                            this._logger.appendLine(JSON.stringify(topology));
                            const errorList = GraphEditorPanel.parseDirectMethodError(error, topology);
                            createGraphPanel.postMessage({ name: Constants.PostMessageNames.failedOperationReason, data: errorList });
                            this._logger.logError(
                                `${Localizer.localize(this._moduleDetails.legacyModule ? "saveGraphFailedError" : "topology.save.failedError")} "${topology.name}"`,
                                errorList
                            );
                        }
                    );
                }
            });
        }
    }

    public async deleteGraphCommand() {
        if (this._graphTopology) {
            const allowDelete = await ExtensionUtils.showConfirmation(
                Localizer.localize(this._moduleDetails.legacyModule ? "deleteGraphConfirmation" : "topology.delete.confirmation")
            );
            if (allowDelete) {
                TopologyData.deleteTopology(this.iotHubData, this._moduleDetails, this._graphTopology.name).then(
                    (response) => {
                        TreeUtils.refresh();
                        this._logger.showInformationMessage(
                            `${Localizer.localize(this._moduleDetails.legacyModule ? "deleteGraphSuccessMessage" : "topology.delete.successMessage")} "${
                                this._graphTopology!.name
                            }"`
                        );
                    },
                    (error) => {
                        const errorList = GraphEditorPanel.parseDirectMethodError(error);
                        this._logger.logError(
                            `${Localizer.localize(this._moduleDetails.legacyModule ? "deleteGraphFailedError" : "topology.delete.failedError")} "${
                                this._graphTopology!.name
                            }"`,
                            errorList
                        );
                    }
                );
            }
        }
    }

    public async showTopologyJson() {
        if (this._graphTopology) {
            vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(this._graphTopology, undefined, 4) }).then((doc) => {
                vscode.window.showTextDocument(doc);
            });
        }
    }

    public createNewGraphInstanceCommand(context: vscode.ExtensionContext) {
        const graphInstance = new LivePipelineItem(this.iotHubData, this._moduleDetails, this._graphTopology!, undefined, (name) => {
            return (
                this._graphInstances == null ||
                this._graphInstances.length == 0 ||
                this._graphInstances.filter((instance) => {
                    return instance.name === name;
                }).length === 0
            );
        });
        graphInstance.setInstanceCommand(context);
    }
}
