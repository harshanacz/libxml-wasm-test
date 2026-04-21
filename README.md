A proof-of-concept demonstrating that `libxml2-wasm` can successfully power the `@wso2/mi-language-server` for strict XML/XSD validation in web-based environments (like `vscode.dev`).

| Test File | What It Proves |
|-----------|----------------|
| **test-basic-validation.js** | Proves that the massive WSO2 schema tree compiles successfully in WASM and catches standard schema violations. |
| **test-column-demo.js** | Proves exactly how VS Code diagnostics are drawn (Line + Column for syntax errors, Line-level for schema errors). Clearly demonstrates how to map libxml2 output to VS Code's Diagnostic interface. |
| **test-incomplete-xml.js** | Proves engine resilience. Incomplete/malformed XML does NOT produce an AST tree (parsing fails), BUT the engine does NOT crash. This is critical because users type character-by-character. Unclosed tags, missing quotes, and half-typed elements throw catchable errors with accurate line/column positions, allowing the Language Server to show diagnostics without crashing. |
| **test-dynamic-schema-generation.js** | Proves that Connectors (e.g., Salesforce) can be injected dynamically without restarting the language server, matching the behavior of @wso2/mi-language-server. |
| **test-concurrent-schemas.js** | Proves support for multi-root workspaces in VS Code. Multiple projects (e.g., WSO2 MI 4.3.0 and 4.4.0) can run side-by-side with independent validators in memory without conflicts. |

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




