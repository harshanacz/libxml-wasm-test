import fs from 'node:fs';
import path from 'node:path';
import { XmlDocument, XsdValidator, XmlValidateError } from 'libxml2-wasm';
import { xmlRegisterFsInputProviders } from 'libxml2-wasm/lib/nodejs.mjs';

console.log("=== Testing Incomplete/Malformed XML (Real-World Typing Scenarios) ===\n");

xmlRegisterFsInputProviders();

const mainSchemaPath = path.resolve('./schemas/440/synapse_config.xsd');

// Load and compile the schema once
let schemaDoc = null;
let validator = null;

try {
    const schemaText = fs.readFileSync(mainSchemaPath, 'utf8');
    schemaDoc = XmlDocument.fromString(schemaText, { url: `file://${mainSchemaPath}` });
    validator = XsdValidator.fromDoc(schemaDoc);
    console.log("✓ Schema compiled successfully\n");
} catch (err) {
    console.error("Failed to compile schema:", err.message);
    process.exit(1);
}

// Test cases simulating real user typing
const testCases = [
    {
        name: "Scenario 1: User just started typing",
        xml: `<sequence><lo`,
        description: "Incomplete opening tag",
        // Expected: Parsing fails - "Couldn't find end of Start Tag lo"
        // Result: No validation possible, syntax error shown with line & column
        // Evaluation: ✓ PASS - Graceful error handling, no crash, accurate position
    },
    {
        name: "Scenario 2: Unclosed tag",
        xml: `<?xml version="1.0"?>
<definitions xmlns="http://ws.apache.org/ns/synapse">
    <sequence name="test">
        <log level="full"`,
        description: "Tag not closed, no >",
        // Expected: Parsing fails - "Couldn't find end of Start Tag log"
        // Result: No validation possible, syntax error at line 4, col 26
        // Evaluation: ✓ PASS - Detects incomplete tag, provides exact location
    },
    {
        name: "Scenario 3: Missing closing tags",
        xml: `<?xml version="1.0"?>
<definitions xmlns="http://ws.apache.org/ns/synapse">
    <sequence name="test">
        <log level="full"/>`,
        description: "Missing </sequence> and </definitions>",
        // Expected: Parsing fails - "Premature end of data in tag sequence"
        // Result: No validation possible, detects first unclosed tag
        // Evaluation: ✓ PASS - Identifies structural issue, user can fix incrementally
    },
    {
        name: "Scenario 4: Attribute without value",
        xml: `<?xml version="1.0"?>
<definitions xmlns="http://ws.apache.org/ns/synapse">
    <sequence name=>
    </sequence>
</definitions>`,
        description: "Attribute with no value",
        // Expected: Parsing fails - "AttValue: \" or ' expected"
        // Result: No validation possible, syntax error at attribute position
        // Evaluation: ✓ PASS - Clear error message about missing attribute value
    },
    {
        name: "Scenario 5: Completely broken mid-typing",
        xml: `<?xml version="1.0"?>
<definitions xmlns="http://ws.apache.org/ns/synapse">
    <proxy name="Test" transports="https">
        <target>
            <inSequence>
                <log level="full"/>
                <call>
                    <endpoint>
                        <http uri-template="https://api.example.com/`,
        description: "Multiple unclosed tags, incomplete attribute",
        // Expected: Parsing fails - "AttValue: ' expected" + multiple errors
        // Result: No validation possible, shows first syntax error encountered
        // Evaluation: ✓ PASS - Reports first error, doesn't cascade into confusion
    },
    {
        name: "Scenario 6: Valid XML but schema violation",
        xml: `<?xml version="1.0"?>
<definitions xmlns="http://ws.apache.org/ns/synapse">
    <proxy name="Test" badAttribute="oops">
        <target>
            <inSequence>
                <log level="full"/>
            </inSequence>
        </target>
    </proxy>
</definitions>`,
        description: "Well-formed XML with schema error",
        // Expected: Parsing succeeds, validation fails
        // Result: Shows schema errors - "badAttribute not allowed" + "transports required"
        // Note: Column will be 0 for validation errors (only line number available)
        // Evaluation: ✓ PASS - Validation works once XML is well-formed, multiple errors reported
    }
];

// Run each test
testCases.forEach((test, index) => {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log(`${"=".repeat(70)}`);
    
    let xmlDoc = null;
    
    try {
        // Step 1: Try to parse the XML
        console.log("\n[STEP 1] Attempting to parse XML...");
        xmlDoc = XmlDocument.fromString(test.xml);
        console.log("✓ XML parsed successfully (document tree created)");
        
        // Step 2: Try to validate against schema
        console.log("\n[STEP 2] Attempting XSD validation...");
        try {
            validator.validate(xmlDoc);
            console.log("✓ XML is valid according to schema!");
        } catch (validationErr) {
            console.log("✗ XSD Validation failed (expected):");
            if (validationErr instanceof XmlValidateError && validationErr.details) {
                validationErr.details.forEach((detail, i) => {
                    console.log(`  ${i + 1}. Line ${detail.line}: ${detail.message.trim()}`);
                });
            } else {
                console.log(`  ${validationErr.message}`);
            }
        }
        
    } catch (parseErr) {
        console.log("✗ XML parsing FAILED (cannot create document tree):");
        if (parseErr.details) {
            parseErr.details.forEach((detail, i) => {
                console.log(`  ${i + 1}. Line ${detail.line}, Col ${detail.col}: ${detail.message.trim()}`);
            });
        } else {
            console.log(`  ${parseErr.message}`);
        }
        console.log("\n⚠️  RESULT: Cannot validate - parsing must succeed first");
    } finally {
        if (xmlDoc) {
            xmlDoc.dispose();
        }
    }
});

// Cleanup
if (validator) validator.dispose();
if (schemaDoc) schemaDoc.dispose();

console.log(`\n${"=".repeat(70)}`);
console.log("=== CONCLUSION ===");
console.log(`${"=".repeat(70)}`);
console.log(`
Key Findings:
1. If XML is malformed (syntax errors), parsing fails BEFORE validation
2. XSD validation ONLY runs on successfully parsed XML documents
3. The validator does NOT crash - it throws catchable errors
4. For IDE integration, you need TWO error layers:
   a) Parsing errors (syntax) - shown immediately
   b) Validation errors (schema) - shown only when XML is well-formed

Recommendation for VS Code Extension:
• Run parsing in try-catch to detect syntax errors
• Only attempt XSD validation if parsing succeeds
• Show both types of errors in the Problems panel
• Parsing errors take priority (must fix first)
`);
