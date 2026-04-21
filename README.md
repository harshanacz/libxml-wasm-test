A proof-of-concept demonstrating that `libxml2-wasm` can successfully power the `@wso2/mi-language-server` for strict XML/XSD validation in web-based environments (like `vscode.dev`).

## What This Proves
1. **Complex XSD Includes:** Successfully resolves deep `<xs:include>` trees across 12+ WSO2 schema files using custom File System providers.
```bash
node test-basic-validation.js
```

2. **Error Position Tracking:**
   - **Parsing errors** (syntax): Line + Column ✓
   - **Validation errors** (schema): Line only, Column = 0 ✗
   - Engine doesn't crash on incomplete XML (safe for real-time IDE validation)
```bash
node test-column-demo.js        # Shows column behavior
node test-incomplete-xml.js     # Tests malformed XML handling
```
3. **Dynamic Connectors:** Proves that dynamically writing to `connectors.xsd` and recompiling the validator on the fly instantly clears diagnostic errors for downloaded connectors (e.g., Salesforce).
```bash
node test-dynamic-schema-generation.js
```

4. **Concurrent Schema Instances:** Multiple XSD validators loaded simultaneously in memory, each maintaining independent schema state. Router switches between validators instantly based on document URI.
```bash
node test-concurrent-schemas.js
```




