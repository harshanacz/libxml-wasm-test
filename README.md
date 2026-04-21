# WSO2 WASM Validation Prototype

A proof-of-concept demonstrating that `libxml2-wasm` can successfully power the `@wso2/mi-language-server` for strict XML/XSD validation in web-based environments (like `vscode.dev`).

## What This Proves
This project successfully verifies the 4 core requirements for the WSO2 Language Server:
1. **WASM Compatibility:** Replaces Java-based `Xerces` with a strict, web-compatible C-parser.
2. **Complex XSD Includes:** Successfully resolves deep `<xs:include>` trees across 12+ WSO2 schema files using custom File System providers.
3. **Precise Diagnostics:** Extracts exact `Line` and `Column` numbers from XML errors to power VS Code red squiggly lines.
4. **Dynamic Connectors:** Proves that dynamically writing to `connectors.xsd` and recompiling the validator on the fly instantly clears diagnostic errors for downloaded connectors (e.g., Salesforce).

## How to Run the Tests

The tests simulate the exact lifecycle of a user writing WSO2 code and downloading a connector in VS Code.

### Test 1: The Initial State
Run the baseline validation where the user has a syntax error AND an unknown connector:
```bash
node wso2-test1.js