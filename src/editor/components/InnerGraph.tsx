import * as React from "react";
import {
  CanvasMouseMode,
  Graph,
  GraphDataChangeType,
  GraphNodeState,
  ICanvasData,
  ICanvasNode,
  IGraphDataChangeEvent,
  IPropsAPI,
  IZoomPanSettings,
  RegisterEdge,
  RegisterPanel,
  TSetData,
  TSetZoomPanSettings,
  usePropsAPI,
  GraphFeatures,
} from "@vienna/react-dag-editor";
import { CustomEdgeConfig } from "./CustomEdgeConfig";
import { NodePropertiesPanel } from "./NodePropertiesPanel";
import LocalizerHelpers from "../../helpers/LocalizerHelpers";
import { MediaGraphParameterDeclaration } from "../../lva-sdk/lvaSDKtypes";

export interface IInnerGraphProps {
  data: ICanvasData;
  setData: TSetData;
  zoomPanSettings: IZoomPanSettings;
  setZoomPanSettings: TSetZoomPanSettings;
  canvasMouseMode: CanvasMouseMode;
  isHorizontal?: boolean;
  onNodeAdded?: (node: ICanvasNode) => void;
  onNodeRemoved?: (nodes: Set<string>) => void;
  onChange?: (evt: IGraphDataChangeEvent) => void;
  readOnly?: boolean;
  parameters?: MediaGraphParameterDeclaration[];
}

export const InnerGraph: React.FunctionComponent<IInnerGraphProps> = (
  props
) => {
  const propsApiRef = React.useRef<IPropsAPI>(null);
  const propsApi = usePropsAPI();
  const svgRef = React.useRef<SVGSVGElement>(null);

  // open node inspector panel when recovering state, a node is clicked, or a node is added
  const inspectNode = (node?: ICanvasNode) => {
    if (node && propsApiRef.current) {
      propsApiRef.current.openSidePanel("node", node);
    }
  };
  props.data.nodes.forEach((node) => {
    if (node.state === GraphNodeState.selected) {
      inspectNode(node);
    }
  });
  const onNodeClick = (_e: React.MouseEvent, node: ICanvasNode) => {
    inspectNode(node);
  };
  const onAddNode = (node?: ICanvasNode) => {
    inspectNode(node);
  };

  const dismissSidePanel = () => {
    if (propsApiRef.current) {
      propsApiRef.current.dismissSidePanel();
    }
  };

  const onChange = (
    evt: IGraphDataChangeEvent,
    ref: React.RefObject<SVGSVGElement>
  ) => {
    if (props.onChange) {
      props.onChange(evt);
    }
    switch (evt.type) {
      case GraphDataChangeType.addNode:
        onAddNode(evt.payload);
        if (props.onNodeAdded && evt.payload) props.onNodeAdded(evt.payload);
        break;
      case GraphDataChangeType.deleteNode: // in case just a node is removed
      case GraphDataChangeType.deleteMultiple: // in case nodes + attached edges are removed
        dismissSidePanel();
        if (props.onNodeRemoved && evt.payload && evt.payload.selectedNodeIds)
          props.onNodeRemoved(evt.payload.selectedNodeIds);
        break;
      default:
    }
  };

  const readOnlyFeatures = new Set([
    "a11yFeatures",
    "canvasScrollable",
    "panCanvas",
    "clickNodeToSelect",
    "sidePanel",
    "editNode",
  ]) as Set<GraphFeatures>;

  return (
    <>
      {props.parameters && (
        <RegisterPanel
          name={"node"}
          config={new NodePropertiesPanel(propsApi, props.parameters)}
        />
      )}
      <RegisterEdge
        name={"customEdge"}
        config={new CustomEdgeConfig(propsApi)}
      />
      <Graph
        svgRef={svgRef}
        propsAPIRef={propsApiRef}
        data={props.data}
        setData={props.setData}
        onCanvasClick={dismissSidePanel}
        zoomPanSettings={props.zoomPanSettings}
        setPanZoomPanSettings={props.setZoomPanSettings}
        onNodeClick={onNodeClick}
        onChange={onChange}
        defaultNodeShape="module"
        defaultPortShape="modulePort"
        defaultEdgeShape="customEdge"
        canvasMouseMode={props.canvasMouseMode}
        getNodeAriaLabel={LocalizerHelpers.getNodeAriaLabel}
        getPortAriaLabel={LocalizerHelpers.getPortAriaLabel}
        features={props.readOnly ? readOnlyFeatures : undefined}
      />
    </>
  );
};
