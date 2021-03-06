# Azure Video Analyzer Extension for VS Code

## Usage

Ensure you can access internal resources with `npm run refreshVSToken`, then install the dependencies using `npm install`.

### Run in VS Code

Run `npm run compile` and press <kbd>F5</kbd> in VS Code. You should see the extension in the bottom right, expand it if needed.

### Run in Browser for Development

Run `npm run dev` and a new browser window should open with the editor. Changes to files will trigger a rebuild and refresh the browser. This view will only show the topology editor. To test all functionality, you need to run the actual extension as explained above.

## Notes

### Static Definition Files

To avoid redundant recalculation of the list of available nodes shown in the sidebar and the information about each, this information is pre-computed and stored on disk. The definitions are derived from the Swagger JSON for Video Analyzer. You should be able to find it in the [azure-rest-api-specs repo](https://github.com/Azure/azure-rest-api-specs/blob/master/specification/mediaservices/data-plane/LiveVideoAnalytics.Edge/preview/1.0/LiveVideoAnalytics.json).

During this pre-computation, two files are generated in the `src/definitions/data` folder: `nodes.json` and `i18n.en.json`. The second file contains all localizable description strings extracted from the node definitions. `nodes.json` only contains placeholders, the descriptions are localized when the editor runs.

If needed (for example when a new version is released), create a new folder in `tools/definition-generator` for the version you are introducing. Add a `VideoAnalyzer.json` file with the updated Swagger definitions and a list `usableNodes.json`. Update `tools/definition-generator/entry.ts` with the version you are targeting and run `npm run create-definitions` to create the a new set of pre-computed files.

Only new values are added to the `i18n.en.json` file. Already localized values are left unchanged. To regenerate this file from scratch, delete it and rerun the definition generator. You can also regenerate specific keys by deleting them from the file and running the command. The `nodes.json` file is overwritten each time.

### Type Definitions

`src/data/index.ts` contains type TypeScript definitions automatically generated using [AutoRest](https://github.com/Azure/AutoRest). See [this document](https://microsoft.sharepoint.com/teams/AMSPortalandApplicationsEngineering/_layouts/OneNote.aspx?id=%2Fteams%2FAMSPortalandApplicationsEngineering%2FShared%20Documents%2FGeneral%2FPortal%26SDK&wd=target%28Portal.one%7CFDD0EEF3-EAF9-4ADB-95D0-89F9D3DE36D3%2FUpdate%20Portal%20SDK%20typescripts%7C3AF23385-1893-4B0A-BF51-4F1C396F5C11%2F%29) for more information on how to generate them.

-   Install AutoRest: `npm install -g autorest`
-   Download a copy of [azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs) (clone or download as ZIP). You can just unzip the needed folder (`VideoAnalyzer.Edge`).
-   Navigate into the folder containing the LVA Swagger definition (probably `cd specification/mediaservices/data-plane/VideoAnalyzer.Edge/BRANCH/VERSION`),
-   Run `autorest --typescript --input-file="VideoAnalyzer.json" --output-folder="output" --generate-metadata --enum-types=true --model-date-time-as-string=true`
-   Open the generated `index.ts` file in `output\src\models` and make the following changes to fix errors:
    -   Remove the import statements
    -   Remove type definitions including references to `msRest.HttpResponse`
    -   Remove `extends ServiceClientOptions`

### Theme

When run in VS Code, the editor will automatically adapt to the user's theme. Avoid using pre-defined colors and try to use `var(--vscode-*)` CSS variables defined by VS Code to theme UI elements. You can also add new variables scoped to the user's theme kind (light, dark, high contrast) in `App.css`.

Since the VS Code theme variables are not available when run in the browser for development mode, variables from the default light theme have been predefined in `public/index.html`.
