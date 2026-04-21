import fs from 'node:fs';
import path from 'node:path';
import { XmlDocument, XsdValidator, XmlValidateError } from 'libxml2-wasm';
import { xmlRegisterFsInputProviders } from 'libxml2-wasm/lib/nodejs.mjs';

async function runRealWorldConnectorTest() {
    console.log("--- @wso2/mi-language-server Connector Lifecycle Test ---\n");
    xmlRegisterFsInputProviders();

    const schemasDir = path.resolve('./schemas/440');
    const mainSchemaPath = path.join(schemasDir, 'synapse_config.xsd');
    const mediatorsDir = path.join(schemasDir, 'mediators');
    const connectorsSchemaPath = path.join(mediatorsDir, 'connectors.xsd');

    // 1. SETUP: Make sure the mediators folder exists
    if (!fs.existsSync(mediatorsDir)) {
        fs.mkdirSync(mediatorsDir, { recursive: true });
    }

    // 2. SETUP: Ensure synapse_config.xsd actually includes mediators/connectors.xsd
    let mainSchemaText = fs.readFileSync(mainSchemaPath, 'utf8');
    if (!mainSchemaText.includes('connectors.xsd')) {
        console.log("⚙️ Patching synapse_config.xsd to include mediators/connectors.xsd...");
        mainSchemaText = mainSchemaText.replace('</xs:schema>', '    <xs:include schemaLocation="mediators/connectors.xsd"/>\n</xs:schema>');
        fs.writeFileSync(mainSchemaPath, mainSchemaText);
    }

    // 3. SETUP: Write an EMPTY connectors.xsd (Before downloading connector)
    const emptyConnectorsXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" targetNamespace="http://ws.apache.org/ns/synapse" xmlns="http://ws.apache.org/ns/synapse">
    <!-- Empty before connector is downloaded -->
</xs:schema>`;
    fs.writeFileSync(connectorsSchemaPath, emptyConnectorsXsd);

    // XML Payloads
    const badPayload = `<salesforce.getContact xmlns="http://ws.apache.org/ns/synapse" configKey="MySFConfig" wrongId="12345" />`;
    const goodPayload = `<salesforce.getContact xmlns="http://ws.apache.org/ns/synapse" configKey="MySFConfig" contactId="12345" />`;

    // Helper to compile the main schema
    function compileMainSchema() {
        const schemaText = fs.readFileSync(mainSchemaPath, 'utf8');
        const schemaDoc = XmlDocument.fromString(schemaText, { url: `file://${mainSchemaPath}` });
        const validator = XsdValidator.fromDoc(schemaDoc);
        schemaDoc.dispose();
        return validator;
    }

    try {
        // =====================================================================
        // STEP 1: Validate BEFORE connector is downloaded
        // =====================================================================
        console.log("🟦 STEP 1: Validating BEFORE connector is downloaded (Empty connectors.xsd)");
        let validatorBefore = compileMainSchema();
        let badXmlDoc = XmlDocument.fromString(badPayload);
        
        try {
            validatorBefore.validate(badXmlDoc);
        } catch (err) {
            console.log(`   ❌ ERROR: ${err.details[0].message.trim()}`);
            console.log(`   (Correct! The language server doesn't know about salesforce.getContact yet)\n`);
        }
        validatorBefore.dispose(); // Clean up memory


        // =====================================================================
        // STEP 2: Simulate mi-language-server generating the schema
        // =====================================================================
        console.log("⚙️  Language Server downloads Salesforce connector...");
        console.log("⚙️  Writing to mediators/connectors.xsd...");
        const populatedConnectorsXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" targetNamespace="http://ws.apache.org/ns/synapse" xmlns="http://ws.apache.org/ns/synapse">
    <xs:element name="salesforce.getContact">
        <xs:complexType>
            <xs:attribute name="configKey" type="xs:string" use="required"/>
            <xs:attribute name="contactId" type="xs:string" use="required"/>
        </xs:complexType>
    </xs:element>
</xs:schema>`;
        fs.writeFileSync(connectorsSchemaPath, populatedConnectorsXsd);


        // =====================================================================
        // STEP 3: Validate AFTER connector is downloaded (with typo)
        // =====================================================================
        console.log("\n🟨 STEP 3: Validating AFTER connector is downloaded (User typed 'wrongId')");
        let validatorAfter = compileMainSchema(); // Re-compile because connectors.xsd changed!
        
        try {
            validatorAfter.validate(badXmlDoc);
        } catch (err) {
            console.log(`   ❌ ERROR: ${err.details[0].message.trim()}`);
            console.log(`   (Correct! It recognizes the connector, but caught the 'wrongId' typo)\n`);
        }
        badXmlDoc.dispose();


        // =====================================================================
        // STEP 4: Validate AFTER user fixes the typo
        // =====================================================================
        console.log("🟩 STEP 4: User fixes the typo to 'contactId'...");
        let goodXmlDoc = XmlDocument.fromString(goodPayload);
        
        try {
            validatorAfter.validate(goodXmlDoc);
            console.log(`   ✅ SUCCESS: The payload is completely valid!`);
        } catch (err) {
            console.log(`   ❌ ERROR: ${err.message}`);
        }
        goodXmlDoc.dispose();
        validatorAfter.dispose();

    } catch (fatal) {
        console.error(`💥 FATAL ERROR:`, fatal);
    }
}

runRealWorldConnectorTest();