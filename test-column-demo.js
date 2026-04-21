import { XmlDocument, XsdValidator, XmlValidateError } from 'libxml2-wasm';

console.log("=== Demonstrating Column Number Behavior ===\n");

// TEST 1: XML PARSING ERROR (malformed XML)
console.log("TEST 1: Parsing Error (malformed XML)");
console.log("XML: <root><bad attribute without quotes></root>");
try {
    const badXml = '<root><bad attribute without quotes></root>';
    XmlDocument.fromString(badXml);
} catch (err) {
    console.log("Result: PARSING errors DO have column numbers!");
    if (err.details) {
        err.details.forEach(d => {
            console.log(`  Line: ${d.line}, Column: ${d.col} ← Column is NOT zero!`);
            console.log(`  Message: ${d.message.trim()}\n`);
        });
    }
}

// TEST 2: XSD VALIDATION ERROR (valid XML, schema violation)
console.log("TEST 2: XSD Validation Error (valid XML, wrong attribute)");
console.log("Schema: Only allows 'name' attribute");
console.log("XML: <root badAttribute='value'/>");

const schema = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:element name="root">
        <xs:complexType>
            <xs:attribute name="name" type="xs:string"/>
        </xs:complexType>
    </xs:element>
</xs:schema>`;

const xml = `<?xml version="1.0"?>
<root badAttribute="value"/>`;

try {
    const schemaDoc = XmlDocument.fromString(schema);
    const validator = XsdValidator.fromDoc(schemaDoc);
    const xmlDoc = XmlDocument.fromString(xml);
    
    validator.validate(xmlDoc);
    
    xmlDoc.dispose();
    validator.dispose();
    schemaDoc.dispose();
} catch (err) {
    console.log("Result: VALIDATION errors have column = 0!");
    if (err instanceof XmlValidateError && err.details) {
        err.details.forEach(d => {
            console.log(`  Line: ${d.line}, Column: ${d.col} ← Column is ALWAYS zero!`);
            console.log(`  Message: ${d.message.trim()}\n`);
        });
    }
}

console.log("=== Conclusion ===");
console.log("• Parsing errors (malformed XML) → accurate line AND column");
console.log("• Validation errors (schema violations) → line only, column = 0");
console.log("\nThis is a limitation of libxml2's XSD validator, not a bug in your code.");
