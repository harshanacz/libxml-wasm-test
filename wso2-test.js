import fs from 'node:fs';
import path from 'node:path';
import { XmlDocument, XsdValidator, XmlValidateError } from 'libxml2-wasm';
import { xmlRegisterFsInputProviders } from 'libxml2-wasm/lib/nodejs.mjs';

async function runWso2Test() {
    console.log("--- Starting WSO2 WASM Validation Test (Local Schemas) ---");
    
    // 1. Enable Node.js File System access for libxml2-wasm so it can follow <xs:include>
    xmlRegisterFsInputProviders();

    // 2. Point to your local downloaded schema
    const mainSchemaPath = path.resolve('./schemas/440/synapse_config.xsd');
    
    if (!fs.existsSync(mainSchemaPath)) {
        console.error(`❌ Cannot find main schema at: ${mainSchemaPath}`);
        return;
    }

    // 3. Create a sample XML with an intentional error to check line/col numbers
    const xmlPath = path.resolve('./test-payload.xml');
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://ws.apache.org/ns/synapse">
    <!-- This proxy has a deliberate error: 'name' is required but we called it 'badName' -->
    <proxy badName="StockQuoteProxy" transports="https">
        <target>
            <inSequence>
                <log level="full"/>
            </inSequence>
        </target>
    </proxy>
</definitions>`;
    fs.writeFileSync(xmlPath, sampleXml);

    let schemaDoc = null;
    let validator = null;
    let xmlDoc = null;

    try {
        console.log(`1. Parsing Root Schema: ${mainSchemaPath}`);
        const schemaText = fs.readFileSync(mainSchemaPath, 'utf8');
        
        // CRITICAL: Must provide the file URL so the C-library knows where to find the included files!
        // This tells libxml2 that the base folder is 'schemas/440/'
        schemaDoc = XmlDocument.fromString(schemaText, { url: `file://${mainSchemaPath}` });
        
        console.log(`2. Compiling XSD Validator (Testing <xs:include> support)...`);
        // This is where it automatically reads api.xsd, proxy.xsd, mediators/..., etc. from your disk
        validator = XsdValidator.fromDoc(schemaDoc);
        console.log(`✅ Validator compiled successfully! It successfully read all included WSO2 schemas.\n`);

        console.log(`3. Validating WSO2 XML Payload...`);
        const xmlText = fs.readFileSync(xmlPath, 'utf8');
        xmlDoc = XmlDocument.fromString(xmlText);

        validator.validate(xmlDoc);
        console.log(`✅ SUCCESS: XML is valid.`);

    } catch (err) {
        if (err instanceof XmlValidateError) {
            console.error(`❌ VALIDATION FAILED (This is expected because we injected a deliberate error!):`);
            // Exactly what you need for VS Code Diagnostics:
            err.details.forEach((detail, index) => {
                console.error(`  --> Line: ${detail.line}, Column: ${detail.col} | Error: ${detail.message.trim()}`);
            });
        } else {
            console.error(`�� FATAL CRASH: The experimental XSD resolver failed to process WSO2 schemas.`);
            console.error(err);
        }
    } finally {
        if (xmlDoc) xmlDoc.dispose();
        if (validator) validator.dispose();
        if (schemaDoc) schemaDoc.dispose();
    }
}

runWso2Test();