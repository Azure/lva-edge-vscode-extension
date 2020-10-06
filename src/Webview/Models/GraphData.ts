import dagre from "dagre";
import { v4 as uuid } from "uuid";
import { ICanvasData, ICanvasNode, IPropsAPI } from "@vienna/react-dag-editor";
import {
    MediaGraphNodeInput,
    MediaGraphParameterDeclaration,
    MediaGraphProcessorUnion,
    MediaGraphSinkUnion,
    MediaGraphSourceUnion,
    MediaGraphTopology
} from "../../Common/Types/LVASDKTypes";
import Localizer from "../Localization/Localizer";
import {
    CanvasNodeData,
    CanvasNodeProperties,
    GraphInfo,
    MediaGraphNodeType,
    ValidationError
} from "../Types/GraphTypes";
import LocalizerHelpers from "../Utils/LocalizerHelpers";
import NodeHelpers from "../Utils/NodeHelpers";
import GraphData from "./GraphEditorViewModel";
import GraphValidator from "./MediaGraphValidator";

export default class Graph {
    private static readonly nodeTypeList = [MediaGraphNodeType.Source, MediaGraphNodeType.Processor, MediaGraphNodeType.Sink];

    // what we initialized with (contains name, description, etc.)
    private graphInformation: MediaGraphTopology = { name: "" };

    // the target format expects dividing up the nodes into these three types
    private sources: MediaGraphSourceUnion[] = [];
    private processors: MediaGraphProcessorUnion[] = [];
    private sinks: MediaGraphSinkUnion[] = [];

    private graphStructureStore = new GraphData();

    public setGraphData(graphInfo: GraphInfo) {
        this.graphInformation = graphInfo.meta;
        this.graphStructureStore.nodes = graphInfo.nodes;
        this.graphStructureStore.edges = graphInfo.edges;
    }

    public setGraphNodeData(canvasNodeData: ICanvasNode<CanvasNodeData, any>[]) {
        // new node data input to be saved as nodesData
        console.log("setGraphNOdeData", canvasNodeData);
        this.graphStructureStore.nodes = canvasNodeData;
        console.log("graph info", this.graphStructureStore.nodes);
    }

    public setGraphDataFromICanvasData(canvasData: ICanvasData) {
        this.graphStructureStore.nodes = [...canvasData.nodes];
        this.graphStructureStore.edges = [...canvasData.edges];
    }

    // converts internal representation to topology that can be sent using a direct method call
    public setTopology(topology: any) {
        this.graphInformation = topology;
        this.graphStructureStore.nodes = [];
        this.graphStructureStore.edges = [];

        // go through all the sources, processors, and sinks we are given and flatten them into nodes
        for (const nodeType of Graph.nodeTypeList) {
            const nodesForType = topology.properties[NodeHelpers.getNodeTypeKey(nodeType)];
            if (!nodesForType) {
                // no nodes for this type
                continue;
            }

            for (const node of nodesForType) {
                const ports = NodeHelpers.getPorts(node, nodeType).map((port) => {
                    return {
                        ...port,
                        name: LocalizerHelpers.getPortName(node, port),
                        ariaLabel: LocalizerHelpers.getPortAriaLabel(this.getICanvasData(), node, port)
                    };
                });
                const newNode = {
                    nodeProperties: node,
                    nodeType: nodeType
                } as CanvasNodeData;
                this.graphStructureStore.nodes.push({
                    id: uuid(),
                    name: node.name,
                    ariaLabel: Localizer.l("ariaNodeLabelNodeDescription").format(node.name),
                    data: { ...NodeHelpers.getNodeAppearance(newNode), ...newNode },
                    ports: ports,
                    x: 0,
                    y: 0
                });
            }
        }

        this.forEachNodeInput((node: CanvasNodeProperties, input: MediaGraphNodeInput) => {
            const sourceNode = this.graphStructureStore.getNode(input.nodeName || "");
            const sourcePort = this.graphStructureStore.getPort(input.nodeName || "", false);
            const targetNode = this.graphStructureStore.getNode(node.name);
            const targetPort = this.graphStructureStore.getPort(node.name, true);

            // since we know all of the inputs for node, we can form edges (input, node)
            if (sourceNode && sourcePort && targetNode && targetPort) {
                this.graphStructureStore.edges.push({
                    source: sourceNode.id,
                    target: targetNode.id,
                    sourcePortId: sourcePort.id,
                    targetPortId: targetPort.id,
                    id: uuid()
                });
            }
        });

        this.layoutGraph();
    }

    public getTopology() {
        this.sources = [];
        this.processors = [];
        this.sinks = [];

        for (const node of this.graphStructureStore.nodes) {
            const nodeData = node.data;

            if (nodeData) {
                // only save used node properties i.e. those that match the selected types
                const properties = NodeHelpers.getTrimmedNodeProperties(nodeData.nodeProperties as CanvasNodeProperties);
                properties.name = nodeData.nodeProperties.name;

                // get nodes pointing to this node
                properties.inputs = this.graphStructureStore.getNodeInputs(node.id);
                if (properties.inputs.length === 0) {
                    delete properties.inputs;
                }

                // filter into three categories
                switch (nodeData.nodeType) {
                    case MediaGraphNodeType.Source:
                        this.sources.push(properties as any);
                        break;
                    case MediaGraphNodeType.Processor:
                        this.processors.push(properties as any);
                        break;
                    case MediaGraphNodeType.Sink:
                        this.sinks.push(properties as any);
                        break;
                }
            }
        }

        const topology: MediaGraphTopology = {
            name: this.graphInformation.name,
            properties: {
                ...this.graphInformation.properties,
                sources: this.sources,
                processors: this.processors,
                sinks: this.sinks
            }
        };
        if (this.graphInformation.systemData) {
            topology.systemData = this.graphInformation.systemData;
        }
        if (this.graphInformation.apiVersion) {
            // AutoRest changes @apiVersion to apiVersion, here it is changed back
            (topology as any)["@apiVersion"] = this.graphInformation.apiVersion;
        }

        return topology;
    }

    public getParameters(): MediaGraphParameterDeclaration[] {
        return this.graphInformation.properties?.parameters || [];
    }

    public setName(name: string) {
        this.graphInformation.name = name;
    }

    public setDescription(description: string) {
        if (!this.graphInformation.properties) {
            this.graphInformation.properties = {};
        }
        if (description === "") {
            delete this.graphInformation.properties.description;
        } else {
            this.graphInformation.properties.description = description;
        }
    }

    public getName(): string {
        return this.graphInformation.name;
    }

    public getDescription(): string | undefined {
        if (this.graphInformation.properties) {
            return this.graphInformation.properties.description;
        } else {
            return undefined;
        }
    }

    public getICanvasData(): ICanvasData {
        return {
            nodes: this.graphStructureStore.nodes,
            edges: this.graphStructureStore.edges
        };
    }

    public getGraphInfo(): GraphInfo {
        const graphInfo = {
            meta: this.getTopology(),
            nodes: this.graphStructureStore.nodes,
            edges: this.graphStructureStore.edges
        };

        if (this.graphInformation.properties) {
            const props = graphInfo.meta.properties as any;
            props.description = this.graphInformation.properties.description;
            props.parameters = this.graphInformation.properties.parameters;
        }

        return graphInfo;
    }

    public validate(graphPropsApi: React.RefObject<IPropsAPI<any, any, any, any>>, errorsFromService?: ValidationError[]): ValidationError[] {
        return GraphValidator.validate(graphPropsApi, this.graphStructureStore, errorsFromService);
    }

    public checkForParamsInGraphNode(parameter: MediaGraphParameterDeclaration) {
        return GraphValidator.checkForParamsInGraphNode(this.graphStructureStore.nodes, parameter.name);
    }

    public deleteParamsFromGraph(parameter: any) {
        const validatedParameter = "${" + parameter.name + "}";
        const nodes = this.graphStructureStore.nodes;
        const newNodes = [];

        console.log("----- delete start -----");

        for (const node of nodes) {
            const tempNode = this.recursiveDeleteParamsFromGraph(node, validatedParameter);
            // console.log("-*- temp node -*-", tempNode);
            newNodes.push(tempNode);
        }

        console.log("!!!NEW NODES!!!", newNodes);

        return newNodes;
    }

    private recursiveDeleteParamsFromGraph(node: any, parameterName: string) {
        const nodeProperties = Object.keys(node);
        const newObj: any = {};
        for (let i = 0; i < nodeProperties.length; i++) {
            if (typeof node[nodeProperties[i]] != "string" && typeof node[nodeProperties[i]] != "number" && typeof node[nodeProperties[i]] != "boolean") {
                //recursive go down another level
                // console.log("recursion", node[nodeProperties[i]]);
                newObj[nodeProperties[i]] = this.recursiveDeleteParamsFromGraph(node[nodeProperties[i]], parameterName);
                // console.log("newObj after recursion", nodeProperties[i], newObj);
            } else {
                if (node[nodeProperties[i]] === parameterName) {
                    // console.log("found one", nodeProperties[i], node[nodeProperties[i]]);
                    newObj[nodeProperties[i]] = "";
                    // console.log("^newObj^", newObj);
                } else {
                    newObj[nodeProperties[i]] = node[nodeProperties[i]];
                }
            }
        }
        // console.log("newobj b4 return", newObj);
        return newObj;
    }

    // public deleteParamsFromGraph(parameter: any) {
    //     console.log("edit/delete GD", this.graphStructureStore.nodes, parameter);
    //     const validatedParameter = "${" + parameter.name + "}";
    //     const nodes = this.graphStructureStore.nodes;
    //     const newNodes = [];
    //     for (let i = 0; i < nodes.length; i++) {
    //         const properties = NodeHelpers.getTrimmedNodeProperties(nodes[i].data?.nodeProperties as CanvasNodeProperties);
    //         const tempNode = nodes[i];
    //         if (properties.endpoint) {
    //             //check URL
    //             if (properties.endpoint?.url === validatedParameter) {
    //                 console.log("URL");
    //                 tempNode.data ? (tempNode.data.nodeProperties.endpoint.url = "") : console.log("delete url fail");
    //             }
    //             //check Credentials
    //             if (properties.endpoint?.credentials) {
    //                 const credentials = properties.endpoint.credentials;
    //                 const credentialKeys = Object.keys(credentials);
    //                 console.log("Credentials!", credentials, credentialKeys);
    //                 for (let i = 0; i < credentialKeys.length; i++) {
    //                     if (credentials[credentialKeys[i]] === validatedParameter) {
    //                         tempNode.data ? (tempNode.data.nodeProperties.endpoint.credentials[credentialKeys[i]] = "") : console.log("failure credentials");
    //                     }
    //                 }
    //             }
    //         }
    //         newNodes.push(tempNode);
    //     }
    //     return newNodes;
    // }

    // Internal functions

    private layoutGraph() {
        const g = new dagre.graphlib.Graph();
        g.setGraph({
            marginx: 30,
            marginy: 30
        });
        g.setDefaultEdgeLabel(function () {
            return {};
        });

        const width = 350;
        const height = 70;

        for (const node of this.graphStructureStore.nodes) {
            g.setNode(node.id, {
                width: width,
                height: height
            });
        }
        for (const edge of this.graphStructureStore.edges) {
            g.setEdge((edge.source as unknown) as dagre.Edge, edge.target);
        }

        dagre.layout(g);

        this.graphStructureStore.nodes = this.graphStructureStore.nodes.map((node) => ({
            ...node,
            x: g.node(node.id).x - width / 2,
            y: g.node(node.id).y - height / 2
        }));
    }

    // helper to loop through all inputs for all nodes
    private forEachNodeInput(callback: (node: CanvasNodeProperties, input: MediaGraphNodeInput) => void) {
        if (this.graphInformation && this.graphInformation.properties) {
            for (const nodeType of Graph.nodeTypeList) {
                const nodesForType = (this.graphInformation.properties as Record<string, CanvasNodeProperties[]>)[NodeHelpers.getNodeTypeKey(nodeType)];
                if (!nodesForType) {
                    // no nodes for this type
                    continue;
                }

                for (const node of nodesForType) {
                    if (node.inputs) {
                        for (const input of node.inputs) {
                            callback(node, input);
                        }
                    }
                }
            }
        }
    }
}
