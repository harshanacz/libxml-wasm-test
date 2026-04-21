A proof-of-concept demonstrating that `libxml2-wasm` can successfully power the `@wso2/mi-language-server` for strict XML/XSD validation in web-based environments (like `vscode.dev`).

## What This Proves
**Complex XSD Includes:** Successfully resolves deep `<xs:include>` trees across 12+ WSO2 schema files using custom File System providers.
**Precise Diagnostics:** Extracts exact `Line` and `Column` numbers from XML errors to power VS Code red squiggly lines.
**Dynamic Connectors:** Proves that dynamically writing to `connectors.xsd` and recompiling the validator on the fly instantly clears diagnostic errors for downloaded connectors (e.g., Salesforce).

## Run Test
```bash
node wso2-test1.js
```

```bash
node wso2-test2.js
```