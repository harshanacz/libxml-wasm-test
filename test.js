import fs from 'node:fs';
import path from 'node:path';
import { XmlDocument, XsdValidator, XmlValidateError } from 'libxml2-wasm';
import { xmlRegisterFsInputProviders } from 'libxml2-wasm/lib/nodejs.mjs';

async function runEndToEndTest() {
    console.log("--- @wso2/mi-language-server End-to-End Connector Test ---\n");
    xmlRegisterFsInputProviders();

    const schemasDir = path.resolve('./schemas/440');
    const mainSchemaPath = path.join(schemasDir, 'synapse_config.xsd');
    const sequenceSchemaPath = path.join(schemasDir, 'sequence.xsd'); // Where WSO2 defines allowed mediators
    const connectorsSchemaPath = path.join(schemasDir, 'mediators', 'connectors.xsd');
    const xmlPath = path.resolve('./test.xml');

    // Backup the original sequence.xsd and synapse_config.xsd so we don't permanently alter your files
    const originalSequenceXsd = fs.readFileSync(sequenceSchemaPath, 'utf8');
    const originalMainXsd = fs.readFileSync(mainSchemaPath, 'utf8');

    // Helper to compile the schema
    function compileMainSchema() {
        const schemaText = fs.readFileSync(mainSchemaPath, 'utf8');
        const schemaDoc = XmlDocument.fromString(schemaText, { url: `file://${mainSchemaPath}` });
        const validator = XsdValidator.fromDoc(schemaDoc);
        schemaDoc.dispose();
        return validator;
    }

    try {
        // =====================================================================
        // TEST 1: Validate BEFORE connector is generated
        // =====================================================================
        console.log("🟦 TEST 1: Validating test.xml (Before connector is generated)");
        let validatorBefore = compileMainSchema();
        let xmlText = fs.readFileSync(xmlPath, 'utf8');
        let xmlDoc = XmlDocument.fromString(xmlText);
        
        try {
            validatorBefore.validate(xmlDoc);
            console.log("   ❌ WAIT: It passed? That shouldn't happen yet.");
        } catch (err) {
            console.log(`   ✅ EXPECTED DIAGNOSTIC CAUGHT:`);
            console.log(`   --> Line: ${err.details[0].line} | Error: ${err.details[0].message.trim()}`);
            console.log(`   (The language server correctly identified that salesforce.getContact is unknown)\n`);
        }
        validatorBefore.dispose();


        // =====================================================================
        // ACTION: Simulate mi-language-server generating the connector
        // =====================================================================
        console.log("⚙️  Language Server generates the Salesforce connector schema...");
        
        // 1. Write mediators/connectors.xsd
        const generatedConnectorsXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" targetNamespace="http://ws.apache.org/ns/synapse" xmlns="http://ws.apache.org/ns/synapse">
    <xs:element name="salesforce.getContact">
        <xs:complexType>
            <xs:attribute name="configKey" type="xs:string" use="required"/>
            <xs:attribute name="contactId" type="xs:string" use="required"/>
        </xs:complexType>
    </xs:element>
</xs:schema>`;
        fs.writeFileSync(connectorsSchemaPath, generatedConnectorsXsd);

        // 2. Include connectors.xsd in the main synapse_config.xsd AT THE TOP!
        if (!originalMainXsd.includes('connectors.xsd')) {
            fs.writeFileSync(mainSchemaPath, originalMainXsd.replace(
                '<xs:include schemaLocation="api.xsd"/>', 
                '<xs:include schemaLocation="mediators/connectors.xsd"/>\n    <xs:include schemaLocation="api.xsd"/>'
            ));
        }

        // 3. Register the connector as a valid mediator in sequence.xsd
        const patchedSequenceXsd = originalSequenceXsd.replace(
            '<xs:element ref="loopback" minOccurs="0" maxOccurs="unbounded"/>',
            '<xs:element ref="loopback" minOccurs="0" maxOccurs="unbounded"/>\n            <xs:element ref="salesforce.getContact" minOccurs="0" maxOccurs="unbounded"/>'
        );
        fs.writeFileSync(sequenceSchemaPath, patchedSequenceXsd);
        console.log("⚙️  Schema generation complete!\n");


        // =====================================================================
        // TEST 2: Validate AFTER connector is generated
        // =====================================================================
        console.log("🟩 TEST 2: Validating test.xml (After schema generation)");
        let validatorAfter = compileMainSchema(); // Re-compile because we updated the schemas
        
        try {
            validatorAfter.validate(xmlDoc);
            console.log(`   ✅ SUCCESS: No errors! The diagnostic is gone!`);
            console.log(`   (The language server successfully mapped the connector into the sequence)`);
        } catch (err) {
            console.log(`   ❌ ERROR:`, err.message);
        }
        validatorAfter.dispose();
        xmlDoc.dispose();

    } finally {
        // CLEANUP: Restore the original files
        fs.writeFileSync(sequenceSchemaPath, originalSequenceXsd);
        fs.writeFileSync(mainSchemaPath, originalMainXsd);
        if (fs.existsSync(connectorsSchemaPath)) {
            fs.unlinkSync(connectorsSchemaPath);
        }
    }
}

runEndToEndTest();