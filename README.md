# libxml2wasm Test Repository
This repository is used to test WebAssembly integrations with `libxml2`.

## 🔴 **Important Note About libxmlwasm**

> This package (`libxmlwasm`) **cannot validate syntax and XSD together.**  
> - If XML has **syntax errors**, it won't pass to `libxml2` WASM for XSD validation.  
> - Only **well-formed XML** files work, so it’s not suitable for **language servers.**  

---

# **Solution** - Xerces-wasm NPM package

[![npm version](https://img.shields.io/npm/v/xerces-wasm?style=flat-square&color=cb3837)](https://www.npmjs.com/package/xerces-wasm)

You can resolve this limitation by using [`xerces-wasm`](https://www.npmjs.com/package/xerces-wasm).  
This package leverages **Apache Xerces-C** compiled to WebAssembly with a JavaScript wrapper (published to NPM).

**Xerces WASM Highlights:**  
- Provides robust XML parsing and validation.  
- Suitable for use in environments where both syntax and XSD validation are required.  

## Links

- **NPM Package (Xerces WASM):** [xerces-wasm](https://www.npmjs.com/package/xerces-wasm)
- **Source Code (Xerces WASM):** [GitHub Repository](https://github.com/harshanacz/xerces-wasm)


----
Libxml2 WASM test report - 

## But this properly supported 
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




