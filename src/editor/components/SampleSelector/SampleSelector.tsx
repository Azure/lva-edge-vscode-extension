import * as React from "react";
import {
  Dialog,
  DialogType,
  DialogFooter,
  PrimaryButton,
  DefaultButton,
  Dropdown,
  IDropdownOption,
  SpinnerSize,
  Spinner,
} from "office-ui-fabric-react";
import { sampleOptionsList } from "./sampleList";
import { OverwriteConfirmation } from "./OverwriteConfirmation";
import Localizer from "../../../localization/Localizer";

enum Status {
  NoDisplay,
  SelectSample,
  ConfirmOverwrite,
  WaitingOnSampleLoad,
}
interface ISampleSelectorProps {
  loadTopology: (topology: any) => void;
  hasUnsavedChanges: boolean;
}

export const SampleSelector: React.FunctionComponent<ISampleSelectorProps> = (
  props
) => {
  const { loadTopology, hasUnsavedChanges } = props;

  const [topology, storeTopology] = React.useState<any>({});
  const [status, setStatus] = React.useState<Status>(Status.SelectSample);

  const dialogContentProps = {
    type: DialogType.close,
    closeButtonAriaLabel: Localizer.l("closeButtonText"),
    title: Localizer.l("sampleSelectorTitle"),
    subText: Localizer.l("sampleSelectorText"),
  };

  const modalProps = {
    isBlocking: false,
  };

  let selectedSampleName = "";

  const onChange = (
    event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ) => {
    if (option) {
      selectedSampleName = option.key as string;
    }
  };

  const confirmSelection = () => {
    setStatus(Status.WaitingOnSampleLoad);

    fetch(
      "https://api.github.com/repos/Azure/live-video-analytics/git/trees/master?recursive=1"
    )
      .then((response) => response.json() as any)
      .then(
        (data) =>
          data.tree.filter((entry: any) =>
            entry.path.endsWith(selectedSampleName + "/topology.json")
          )[0].url
      )
      .then((apiUrl) => fetch(apiUrl))
      .then((response) => response.json() as any)
      .then((data) => atob(data.content))
      .then((topology) => {
        if (hasUnsavedChanges) {
          setStatus(Status.ConfirmOverwrite);
          storeTopology(JSON.parse(topology));
        } else {
          loadTopology(JSON.parse(topology));
          dismissSelector();
        }
      });
  };

  const dismissSelector = () => {
    setStatus(Status.NoDisplay);
  };

  const confirmedOverwrite = () => {
    loadTopology(topology);
    dismissSelector();
  };

  return (
    <>
      <Dialog
        hidden={
          status === Status.NoDisplay || status === Status.ConfirmOverwrite
        }
        onDismiss={dismissSelector}
        dialogContentProps={dialogContentProps}
        modalProps={modalProps}
      >
        {status === Status.WaitingOnSampleLoad ? (
          <Spinner size={SpinnerSize.large} />
        ) : (
          <Dropdown
            placeholder={Localizer.l("sampleSelectorDropdownPlaceholderText")}
            label={Localizer.l("sampleSelectorDropdownLabel")}
            options={sampleOptionsList}
            onChange={onChange}
            dropdownWidth={700}
          />
        )}

        <DialogFooter>
          <PrimaryButton
            disabled={status === Status.WaitingOnSampleLoad}
            onClick={confirmSelection}
            text={Localizer.l("sampleSelectorLoadSampleButtonText")}
          />
          <DefaultButton
            disabled={status === Status.WaitingOnSampleLoad}
            onClick={dismissSelector}
            text={Localizer.l("cancelButtonText")}
          />
        </DialogFooter>
      </Dialog>

      <OverwriteConfirmation
        shown={status === Status.ConfirmOverwrite}
        confirm={confirmedOverwrite}
        dismiss={dismissSelector}
      />
    </>
  );
};
