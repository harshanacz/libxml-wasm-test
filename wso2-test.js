import fs from 'node:fs';
import path from 'node:path';
import { XmlDocument, XsdValidator, XmlValidateError } from 'libxml2-wasm';
import { xmlRegisterFsInputProviders } from 'libxml2-wasm/lib/nodejs.mjs';

async function runWso2Test() {
    console.log("--- Starting WSO2 WASM Validation Test ---");
    
    // Enable file system access for <xs:include>
    xmlRegisterFsInputProviders();

    // Point exactly to your local WSO2 schemas
    const mainSchemaPath = path.resolve('./schemas/440/synapse_config.xsd');
    const xmlPath = path.resolve('./test-payload.xml');
    
    // Create a dummy payload if it doesn't exist
    if (!fs.existsSync(xmlPath)) {
        fs.writeFileSync(xmlPath, `<?xml version="1.0" encoding="UTF-8"?>\n<definitions xmlns="http://ws.apache.org/ns/synapse">\n    <proxy badName="StockQuoteProxy"/>\n</definitions>`);
    }

    if (!fs.existsSync(mainSchemaPath)) {
        console.error(`❌ Cannot find schema at: ${mainSchemaPath}`);
        return;
    }

    let schemaDoc = null;
    let validator = null;
    let xmlDoc = null;

    try {
        console.log(`1. Parsing Root Schema: ${mainSchemaPath}`);
        const schemaText = fs.readFileSync(mainSchemaPath, 'utf8');
        schemaDoc = XmlDocument.fromString(schemaText, { url: `file://${mainSchemaPath}` });
        
        console.log(`2. Compiling XSD Validator...`);
        try {
            validator = XsdValidator.fromDoc(schemaDoc);
            console.log(`✅ Validator compiled successfully!\n`);
        } catch (schemaErr) {
            console.error(`\n❌ SCHEMA COMPILATION FAILED!`);
            console.error(`The official WSO2 .xsd files have a syntax error.`);
            
            if (schemaErr instanceof XmlValidateError && schemaErr.details) {
                schemaErr.details.forEach((detail) => {
                    // THIS IS THE FIX: Print the exact file name causing the crash!
                    const fileName = detail.file ? path.basename(detail.file) : 'Unknown File';
                    console.error(`  --> File: ${fileName} | Line: ${detail.line} | ${detail.message.trim()}`);
                });
            } else {
                console.error(schemaErr.message);
            }
            console.error(`\nPlease go into that file, delete the duplicate attribute at Line 77, and run this script again.`);
            return; // Stop here until the XSD is patched
        }

        console.log(`3. Validating WSO2 XML Payload...`);
        const xmlText = fs.readFileSync(xmlPath, 'utf8');
        xmlDoc = XmlDocument.fromString(xmlText);

        try {
            validator.validate(xmlDoc);
            console.log(`✅ SUCCESS: XML is valid.`);
        } catch (xmlErr) {
            console.error(`\n❌ XML VALIDATION FAILED (This is expected for our test!):`);
            if (xmlErr instanceof XmlValidateError && xmlErr.details) {
                xmlErr.details.forEach((detail) => {
                    // This proves we get Line and Column numbers for VS Code!
                    console.error(`  --> Line: ${detail.line}, Column: ${detail.col} | Error: ${detail.message.trim()}`);
                });
            }
        }

    } finally {
        if (xmlDoc) xmlDoc.dispose();
        if (validator) validator.dispose();
        if (schemaDoc) schemaDoc.dispose();
    }
}

runWso2Test();