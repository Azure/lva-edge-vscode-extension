import * as React from "react";
import { Stack, TextField } from "@fluentui/react";
import { useBoolean } from "@uifabric/react-hooks";
import { IPanelConfig, usePropsAPI } from "@vienna/react-dag-editor";
import { MediaGraphParameterDeclaration } from "../../Common/Types/VideoAnalyzerSDKTypes";
import Definitions from "../Definitions/Definitions";
import Localizer from "../Localization/Localizer";
import { ParameterizeValueCallback } from "../Types/GraphTypes";
import { PropertyEditor } from "./PropertyEditor/PropertyEditor";
import { AdjustedIconButton } from "./ThemeAdjustedComponents/AdjustedIconButton";

const ParameterEditor = React.lazy(() => import("./ParameterEditor/ParameterEditor"));

interface INodePropertiesPanel {
    readOnly: boolean;
    data: any;
    parameters: MediaGraphParameterDeclaration[];
}

const NodePropertiesPanelCore: React.FunctionComponent<INodePropertiesPanel> = (props) => {
    const { readOnly, parameters, data } = props;
    const propsAPI = usePropsAPI();

    const [isParameterModalOpen, { setTrue: showModal, setFalse: hideModal }] = useBoolean(false);
    const [nodeName, setNodeName] = React.useState(data.name);
    const [parameterizationConfiguration, setParameterizationConfiguration] = React.useState<{
        name: string;
        callback: ParameterizeValueCallback;
        prevValue?: string;
    }>();

    const panelStyle: React.CSSProperties = {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        background: "var(--vscode-editor-background)",
        borderLeft: "1px solid var(--vscode-editorWidget-border)",
        width: 340,
        zIndex: 1000,
        padding: 10,
        overflowY: "auto"
    };

    const nodeProperties = data.data.nodeProperties as any;

    const definition = Definitions.getNodeDefinition(nodeProperties?.["@type"]);

    const requestParameterization = (propertyName: string, callback: ParameterizeValueCallback, prevValue?: string) => {
        setParameterizationConfiguration({
            name: propertyName,
            callback: callback,
            prevValue
        });
        showModal();
    };
    const setNewParameterizedValue = (newValue: string) => {
        if (newValue && parameterizationConfiguration?.callback) {
            parameterizationConfiguration?.callback(newValue);
        }
    };

    const dismissPanel = () => {
        propsAPI.dismissSidePanel();
        propsAPI.selectNodeById([]);
    };

    return (
        <div style={panelStyle}>
            <Stack horizontal horizontalAlign="space-between" tokens={{ childrenGap: "s1" }}>
                <h2 style={{ margin: 0 }}>{Localizer.getLocalizedStrings(definition.localizationKey).title}</h2>
                <AdjustedIconButton
                    iconProps={{
                        iconName: "Clear"
                    }}
                    title={Localizer.l("closeButtonText")}
                    ariaLabel={Localizer.l("propertyEditorCloseButtonAriaLabel")}
                    onClick={dismissPanel}
                />
            </Stack>
            {definition.localizationKey && <p>{Localizer.getLocalizedStrings(definition.localizationKey).description}</p>}
            <PropertyEditor
                nodeTypeName={nodeProperties?.["@type"]}
                nodeId={data.id}
                nodeProperties={nodeProperties}
                readOnly={readOnly}
                requestParameterization={requestParameterization}
            />
            <React.Suspense fallback={<></>}>
                <ParameterEditor
                    onSelectValue={setNewParameterizedValue}
                    parameters={parameters}
                    isShown={isParameterModalOpen}
                    hideModal={hideModal}
                    propertyName={parameterizationConfiguration?.name || ""}
                    prevValue={parameterizationConfiguration?.prevValue || ""}
                />
            </React.Suspense>
        </div>
    );
};

export class NodePropertiesPanel implements IPanelConfig {
    private readonly readOnly: boolean;
    private parameters: MediaGraphParameterDeclaration[];
    constructor(readOnly: boolean, parameters: MediaGraphParameterDeclaration[]) {
        this.readOnly = readOnly;
        this.parameters = parameters;
    }
    public render(data: any): React.ReactElement {
        return <NodePropertiesPanelCore readOnly={this.readOnly} parameters={this.parameters} data={data} />;
    }

    public panelDidOpen(): void {
        //
    }

    public panelDidDismiss(): void {
        //
    }
}
