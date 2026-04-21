A proof-of-concept demonstrating that `libxml2-wasm` can successfully power the `@wso2/mi-language-server` for strict XML/XSD validation in web-based environments (like `vscode.dev`).

## What This Proves
1. **Complex XSD Includes:** Successfully resolves deep `<xs:include>` trees across 12+ WSO2 schema files using custom File System providers.
```bash
node test-basic-validation.js
```

2. **Precise Diagnostics:** Extracts exact `Line` number from XML errors to power VS Code red squiggly lines bt hv to do put a red squiggly line under the entire line bc 'Column' number is always 0. - 
```bash
node test-column-demo.js
```
3. **Dynamic Connectors:** Proves that dynamically writing to `connectors.xsd` and recompiling the validator on the fly instantly clears diagnostic errors for downloaded connectors (e.g., Salesforce).
```bash
node test-dynamic-schema-generation.js
```




