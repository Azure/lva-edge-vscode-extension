import { TextField } from "office-ui-fabric-react";
import * as React from "react";
import Localizer from "../../localization/Localizer";
import { GraphInstanceParameter } from "../../types/graphTypes";

export interface IGraphPanelProps {
    parameters: GraphInstanceParameter[];
    setParameters: (parameters: GraphInstanceParameter[]) => void;
}

export const ParameterPanel: React.FunctionComponent<IGraphPanelProps> = (props) => {
    const { parameters, setParameters } = props;

    const customParameterSetter = (index: number) => {
        return (newValue: GraphInstanceParameter) => {
            parameters[index] = newValue;
            setParameters([...parameters]);
        };
    };

    return (
        <>
            <h2>{Localizer.l("sidebarHeadingParameters")}</h2>
            {parameters &&
                parameters.map((parameter, i) => {
                    return <GraphPanelEditField key={parameter.name} parameter={parameter} setParameter={customParameterSetter(i)} />;
                })}
        </>
    );
};

interface IGraphPanelEditFieldProps {
    parameter: GraphInstanceParameter;
    setParameter: (newValue: GraphInstanceParameter) => void;
}

const GraphPanelEditField: React.FunctionComponent<IGraphPanelEditFieldProps> = (props) => {
    const { parameter, setParameter } = props;
    const { name, type, error } = parameter;
    const [value, setValue] = React.useState<string>(parameter.value);

    const onChange = (event: React.FormEvent, newValue?: string) => {
        if (newValue !== undefined) {
            setValue(newValue);
            setParameter({ ...parameter, value: newValue });
            validateInput(newValue);
        }
    };

    const validateInput = (value: string) => {
        let error = "";
        if (!value) {
            error = Localizer.l("sidebarGraphInstanceParameterMissing");
        }

        // TODO: Perform additional validation

        setParameter({ ...parameter, error });
    };

    return (
        <TextField
            label={name}
            value={value}
            placeholder={Localizer.l("sidebarGraphInstanceParameterPlaceholder").format(type)}
            onChange={onChange}
            errorMessage={error}
            required
        />
    );
};
