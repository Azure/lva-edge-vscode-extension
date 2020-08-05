import { Stack, TextField } from "office-ui-fabric-react";
import * as React from "react";
import {
  CanvasMouseMode,
  ICanvasData,
  ICanvasNode,
  isSupported,
  IZoomPanSettings,
  ReactDagEditor,
  RegisterNode,
  RegisterPort,
  withDefaultPortsPosition,
} from "@vienna/react-dag-editor";
import { graphTheme as theme } from "../editorTheme";
import { ContextMenu } from "./ContextMenu";
import { Toolbar } from "./Toolbar";
import { InnerGraph } from "./InnerGraph";
import { ItemPanel } from "./ItemPanel";
import { NodeBase } from "./NodeBase";
import { modulePort } from "./Port";
import Localizer from "../../localization/Localizer";
import Graph from "../../graph/Graph";
import { ValidationError } from "../../types/graphTypes";
import { ValidationErrorPanel } from "./ValidationErrorPanel";

interface IGraphTopologyProps {
  graph: Graph;
  zoomPanSettings: IZoomPanSettings;
  vsCodeSetState: (state: any) => void;
}

export const GraphTopology: React.FunctionComponent<IGraphTopologyProps> = (
  props
) => {
  const graph = props.graph;
  const [data, setData] = React.useState<ICanvasData>(graph.getICanvasData());
  const [zoomPanSettings, setZoomPanSettings] = React.useState<
    IZoomPanSettings
  >(props.zoomPanSettings);
  const [graphTopologyName, setGraphTopologyName] = React.useState<string>(
    graph.getName()
  );
  const [graphDescription, setGraphDescription] = React.useState<string>(
    graph.getDescription() || ""
  );
  const [validationErrors, setValidationErrors] = React.useState<
    ValidationError[]
  >([]);

  // save state in VS Code when data or zoomPanSettings change
  React.useEffect(() => {
    props.vsCodeSetState({
      graphData: { ...data, meta: graph.getTopology() },
      zoomPanSettings,
    });
  }, [data, zoomPanSettings]);

  if (!isSupported()) {
    return <h1>{Localizer.l("browserNotSupported")}</h1>;
  }

  // nodeNames maps an ID to a name, is updated on node add/remove
  const nodeNames: Record<string, string> = {};
  data.nodes.forEach((node) => {
    nodeNames[node.id] = node.name || "";
  });
  const nodeAdded = (node: ICanvasNode) => {
    nodeNames[node.id] = node.name || "";
  };
  const nodesRemoved = (nodes: Set<string>) => {
    nodes.forEach((nodeId) => delete nodeNames[nodeId]);
  };
  const hasNodeWithName = (name: string) => {
    for (const nodeId in nodeNames) {
      if (nodeNames[nodeId] === name) {
        return true;
      }
    }
    return false;
  };

  const exportGraph = () => {
    graph.setName(graphTopologyName);
    graph.setDescription(graphDescription);
    graph.setGraphDataFromICanvasData(data);

    const validationErrors = graph.validate();
    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors);
    } else {
      setValidationErrors([]);
      const topology = graph.getTopology();
      console.log(topology);
    }
  };

  const onNameChange = (event: React.FormEvent, newValue?: string) => {
    if (newValue) {
      setGraphTopologyName(newValue);
    }
  };

  const onDescriptionChange = (event: React.FormEvent, newValue?: string) => {
    if (typeof newValue !== "undefined") {
      setGraphDescription(newValue);
    }
  };

  const panelStyles = {
    root: {
      boxSizing: "border-box" as const,
      padding: 10,
      overflowY: "auto" as const,
      willChange: "transform",
      height: "100vh",
      width: 300,
      background: "var(--vscode-editorWidget-background)",
      borderRight: "1px solid var(--vscode-editorWidget-border)",
    },
  };

  return (
    <ReactDagEditor theme={theme}>
      <RegisterNode
        name="module"
        config={withDefaultPortsPosition(new NodeBase())}
      />
      <RegisterPort name="modulePort" config={modulePort} />
      <Stack horizontal>
        <Stack.Item styles={panelStyles}>
          <TextField
            label={Localizer.l("sidebarGraphTopologyNameLabel")}
            required
            defaultValue={graphTopologyName}
            placeholder={Localizer.l("sidebarGraphTopologyNamePlaceholder")}
            onChange={onNameChange}
          />
          <TextField
            label={Localizer.l("sidebarGraphDescriptionLabel")}
            defaultValue={graphDescription}
            placeholder={Localizer.l("sidebarGraphDescriptionPlaceholder")}
            onChange={onDescriptionChange}
          />
          {validationErrors.length > 0 && (
            <ValidationErrorPanel validationErrors={validationErrors} />
          )}
          <ItemPanel hasNodeWithName={hasNodeWithName} />
        </Stack.Item>
        <Stack.Item grow>
          <Toolbar
            name={graphTopologyName}
            exportGraph={exportGraph}
            closeEditor={() => {
              alert("TODO: Close editor");
            }}
          />
          <Stack.Item grow>
            <InnerGraph
              data={data}
              setData={setData}
              zoomPanSettings={zoomPanSettings}
              setZoomPanSettings={setZoomPanSettings}
              canvasMouseMode={CanvasMouseMode.pan}
              onNodeAdded={nodeAdded}
              onNodeRemoved={nodesRemoved}
            />
          </Stack.Item>
        </Stack.Item>
      </Stack>
      <ContextMenu />
    </ReactDagEditor>
  );
};
