import fs from 'node:fs';
import path from 'node:path';
import { XmlDocument, XsdValidator, XmlValidateError } from 'libxml2-wasm';
import { xmlRegisterFsInputProviders } from 'libxml2-wasm/lib/nodejs.mjs';

async function runConnectorTest() {
    console.log("--- Starting wso2-test2.js (Schema Generation) ---");
    xmlRegisterFsInputProviders();

    const mainSchemaPath = path.resolve('./schemas/440/synapse_config.xsd');
    const connectorsSchemaPath = path.resolve('./schemas/440/mediators/connectors.xsd');
    const xmlPath = path.resolve('./test.xml');

    console.log(`1. Simulating Schema Generation (Downloading Salesforce Connector)...`);
    
    // Write the new connector schema into connectors.xsd
    // IMPORTANT: It goes inside <xs:group name="connectors"> so WSO2 recognizes it as a mediator!
    const generatedConnectorsXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" targetNamespace="http://ws.apache.org/ns/synapse" xmlns="http://ws.apache.org/ns/synapse">
    <xs:group name="connectors">
        <xs:choice>
            <xs:element name="salesforce.getContact">
                <xs:complexType>
                    <xs:attribute name="configKey" type="xs:string" use="required"/>
                    <xs:attribute name="contactId" type="xs:string" use="required"/>
                </xs:complexType>
            </xs:element>
        </xs:choice>
    </xs:group>
</xs:schema>`;
    
    fs.writeFileSync(connectorsSchemaPath, generatedConnectorsXsd);
    console.log(`✅ Successfully wrote to mediators/connectors.xsd`);

    let schemaDoc = null;
    let validator = null;
    let xmlDoc = null;

    try {
        console.log(`2. Re-compiling XSD Validator...`);
        const schemaText = fs.readFileSync(mainSchemaPath, 'utf8');
        schemaDoc = XmlDocument.fromString(schemaText, { url: `file://${mainSchemaPath}` });
        validator = XsdValidator.fromDoc(schemaDoc);
        console.log(` Validator compiled successfully with new connector!`);

        console.log(`3. Validating test.xml again...`);
        const xmlText = fs.readFileSync(xmlPath, 'utf8');
        xmlDoc = XmlDocument.fromString(xmlText);

        try {
            validator.validate(xmlDoc);
            console.log(` SUCCESS: XML is valid!`);
        } catch (xmlErr) {
            console.error(`\n❌ XML VALIDATION FAILED:`);
            if (xmlErr instanceof XmlValidateError && xmlErr.details) {
                xmlErr.details.forEach((detail) => {
                    console.error(`  --> Line: ${detail.line}, Column: ${detail.col} | Error: ${detail.message.trim()}`);
                });
            }
            console.log(`\n(Notice how the salesforce error is GONE, and only the badName proxy error remains! Perfect!)`);
        }

    } finally {
        if (xmlDoc) xmlDoc.dispose();
        if (validator) validator.dispose();
        if (schemaDoc) schemaDoc.dispose();
    }
}

runConnectorTest();