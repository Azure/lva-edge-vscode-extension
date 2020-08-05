import { v4 as uuid } from "uuid";
import { ICanvasNode, ICanvasPort } from "@vienna/react-dag-editor";
import {
  MediaGraphNodeType,
  NodeDefinition,
  CanvasNodeProperties,
} from "../types/graphTypes";
import Definitions from "../definitions/Definitions";
import Helpers from "./Helpers";

export default class NodeHelpers {
  // maps a MediaGraphNodeType to a string to index into the topology JSON
  static getNodeTypeKey(type: MediaGraphNodeType): string {
    switch (type) {
      case MediaGraphNodeType.Source:
        return "sources";
      case MediaGraphNodeType.Processor:
        return "processors";
      case MediaGraphNodeType.Sink:
        return "sinks";
      default:
        return "";
    }
  }

  // maps a string representation of a node's type to a MediaGraphNodeType
  static getNodeTypeFromString(type: string): MediaGraphNodeType {
    switch (type) {
      case "sources":
        return MediaGraphNodeType.Source;
      case "processors":
        return MediaGraphNodeType.Processor;
      case "sinks":
        return MediaGraphNodeType.Sink;
      default:
        return MediaGraphNodeType.Other;
    }
  }

  // returns the appropriate ports for a node (proper input and input according to type)
  static getPorts(
    node: NodeDefinition,
    type?: MediaGraphNodeType
  ): ICanvasPort[] {
    const ports = [];
    // type might be a value of MediaGraphNodeType that maps to 0, which is falsy
    const nodeType = typeof type === "undefined" ? node.nodeType : type;

    if (
      nodeType === MediaGraphNodeType.Source ||
      nodeType === MediaGraphNodeType.Processor
    ) {
      ports.push({
        id: uuid(),
        shape: "modulePort",
        isInputDisabled: true,
        isOutputDisabled: false,
        name: "", // will be localized later
      });
    }

    if (
      nodeType === MediaGraphNodeType.Sink ||
      nodeType === MediaGraphNodeType.Processor
    ) {
      ports.push({
        id: uuid(),
        shape: "modulePort",
        isInputDisabled: false,
        isOutputDisabled: true,
        name: "", // will be localized later
      });
    }

    return ports;
  }

  // determines appearance properties for a node
  static getNodeAppearance(type: MediaGraphNodeType) {
    switch (type) {
      case MediaGraphNodeType.Source:
        return {
          iconName: "SecurityCamera",
          color: "var(--vscode-terminal-ansiBrightBlue)",
          colorAlt: "var(--vscode-terminal-ansiBlue)",
        };
      case MediaGraphNodeType.Processor:
        return {
          iconName: "Processing",
          color: "var(--vscode-terminal-ansiBrightGreen)",
          colorAlt: "var(--vscode-terminal-ansiGreen)",
        };
      case MediaGraphNodeType.Sink:
        return {
          iconName: "CloudImportExport",
          color: "var(--vscode-terminal-ansiBrightYellow)",
          colorAlt: "var(--vscode-terminal-ansiYellow)",
        };
      default:
        return {};
    }
  }

  // evaluates if a node can be connected to another node (has to be downstream)
  static nodeCanConnectToNode(source: ICanvasNode, target: ICanvasNode) {
    if (source.data && target.data) {
      const sourceNodeType = source.data.nodeType;
      const targetNodeType = target.data.nodeType;

      switch (sourceNodeType) {
        case MediaGraphNodeType.Source:
        case MediaGraphNodeType.Processor:
          return (
            MediaGraphNodeType.Processor === targetNodeType ||
            MediaGraphNodeType.Sink === targetNodeType
          );
        case MediaGraphNodeType.Sink:
          return false;
        default:
          break;
      }
    }
    return true;
  }

  /* To be able to switch between multiple different types of properties without
  loosing the values or properties not needed for the selected type, properties
  that might not be needed are retained. We can remove these when exporting. */
  static getTrimmedNodeProperties(
    nodeProperties: CanvasNodeProperties
  ): CanvasNodeProperties {
    const definition = Definitions.getNodeDefinition(nodeProperties);
    const neededProperties: any = {};

    if (!definition) {
      return {
        "@type": nodeProperties["@type"],
        name: nodeProperties.name,
      };
    }

    // copy over only properties as needed (determined by definition)
    for (const name in definition.properties) {
      const property = definition.properties[name];
      const nestedProperties = (nodeProperties as any)[name];

      if (nestedProperties) {
        if (property && property.type === "object") {
          if (!Helpers.isEmptyObject(nestedProperties)) {
            neededProperties[name] = this.getTrimmedNodeProperties(
              nestedProperties
            );
          }
        } else {
          neededProperties[name] = nestedProperties;
        }
      }
    }

    // validate if any required properties are missing
    for (const name in definition.properties) {
      const isRequiredProperty = definition.required?.includes(name);
      const usedProperties = neededProperties[name];
      const propertyIsMissing =
        !usedProperties || Helpers.isEmptyObject(usedProperties);

      if (isRequiredProperty && propertyIsMissing) {
        // TODO bubble up and show with validation errors in interface
        console.log("Expected to see property", name);
      }
    }

    return {
      "@type": nodeProperties["@type"],
      ...neededProperties,
    };
  }

  // checks if an array contains a node with the given type
  static nodeArrayContainsNodeOfType(nodes: ICanvasNode[], nodeType: string) {
    for (const node of nodes) {
      if (node.data && node.data.nodeProperties["@type"] === nodeType) {
        return true;
      }
    }
    return false;
  }

  // checks if an array contains a node with the given ID
  static nodeArrayContainsNodeId(
    nodes: ICanvasNode[],
    nodeId: string
  ): boolean {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return true;
      }
    }
    return false;
  }
}
