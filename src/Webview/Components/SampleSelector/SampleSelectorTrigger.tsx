import * as React from "react";
import {
    ActionButton,
    CommandBarButton,
    IContextualMenuItem,
    IContextualMenuProps
} from "@fluentui/react";
import { useConst } from "@uifabric/react-hooks";
import { PipelineTopology } from "../../../Common/Types/VideoAnalyzerSDKTypes";
import Definitions from "../../Definitions/Definitions";
import Localizer from "../../Localization/Localizer";
import { OverwriteConfirmation } from "./OverwriteConfirmation";
import { Status } from "./statusEnum";

interface ISampleSelectorTriggerProps {
    setTopology: (topology: PipelineTopology) => void;
    hasUnsavedChanges: boolean;
}

export const SampleSelectorTrigger: React.FunctionComponent<ISampleSelectorTriggerProps> = (props) => {
    const [status, setStatus] = React.useState<Status>(Status.NoDisplay);
    const [selectedSample, setSelectedSample] = React.useState<string>("");
    const [menuProps, setMenuProps] = React.useState<IContextualMenuProps>();
    const [gitHubInfo, setGitHubInfo] = React.useState<{ apiUrl: string; token?: string }>();

    const menuItemOnClick = (e: any, item: any) => {
        setStatus(props.hasUnsavedChanges ? Status.ConfirmOverwrite : Status.SelectSample);
        setSelectedSample(item.key);
        setStatus(Status.ConfirmOverwrite);
    };

    const loadTopology = (selectedSample: string) => {
        setStatus(Status.WaitingOnSampleLoad);

        let requestInit: RequestInit | undefined = undefined;
        if (gitHubInfo?.token) {
            const requestHeaders = new Headers();
            requestHeaders.append("Authorization", gitHubInfo.token);
            requestHeaders.append("Content-Type", "application/vnd.github.groot-preview+json");
            requestInit = { method: "GET", headers: requestHeaders };
        }
        fetch(gitHubInfo!.apiUrl, requestInit)
            .then((response) => response.json() as any)
            .then((data) => data.tree.filter((entry: any) => entry.path === selectedSample)[0].url)
            .then((apiUrl) => fetch(apiUrl, requestInit))
            .then((response) => response.json() as any)
            .then((data) => atob(data.content))
            .then((topology) => {
                setStatus(Status.NoDisplay);
                props.setTopology(JSON.parse(topology));
            });
    };

    const dismissSelector = () => {
        setStatus(Status.NoDisplay);
    };

    const confirmedOverwrite = () => {
        setStatus(Status.SelectSample);
        loadTopology(selectedSample);
    };

    const getMenuProps = async () => {
        const versionFolder = Definitions.VersionFolder;
        const SamplesSelectorList = await import(`../../Definitions/${versionFolder}/SampleSelectorList`);
        setGitHubInfo(SamplesSelectorList.SamplesList.gitHubInfo);
        setMenuProps({
            shouldFocusOnMount: true,
            items: SamplesSelectorList.SamplesList.getCommandBarItems(menuItemOnClick)
        });
    };

    React.useEffect(() => {
        getMenuProps();
    }, []);

    return (
        <>
            <CommandBarButton iconProps={{ iconName: "Flow" }} menuProps={menuProps}>
                {Localizer.l("sampleSelectorButtonText")}
            </CommandBarButton>

            <OverwriteConfirmation shown={status === Status.ConfirmOverwrite} confirm={confirmedOverwrite} dismiss={dismissSelector} />
        </>
    );
};
