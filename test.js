import fs from 'node:fs';
import { XmlDocument } from 'libxml2-wasm';

async function runTests() {
    console.log("Starting libxml2-wasm Compatibility Tests...\n");

    const mainXsdText = fs.readFileSync('./main.xsd', 'utf8');

    // =========================================================================
    // TEST 1 & 2: Error Positioning & XSD Includes
    // =========================================================================
    console.log("--- TEST 1 & 2: Error Positioning & XSD Includes ---");
    try {
        // We violate the schema by forgetting the required 'name' attribute
        const invalidXml = `<proxy badAttribute="yes"></proxy>`;
        
        const doc = XmlDocument.fromString(invalidXml);
        
        // NOTE: If this fails, it means Test 2 (XSD Includes) does not work properly!
        // The parser might not know how to resolve "base.xsd" from memory.
        const schema = XmlDocument.fromString(mainXsdText); 
        
        // Assuming the library provides a validate method returning an array of errors:
        // (You may need to adjust the exact validate() method call based on their API docs)
        const errors = doc.validate(schema);
        
        console.log("Raw Errors returned:", JSON.stringify(errors, null, 2));

        if (errors && errors.length > 0) {
            const firstError = errors[0];
            if ('line' in firstError || 'column' in firstError) {
                console.log("SUCCESS: Errors contain precise line/column coordinates.");
            } else {
                console.log("FAIL: Errors lack line/column coordinates. You cannot highlight code in VS Code.");
            }
        } else {
            console.log("FAIL: Validation passed when it should have failed, or XSD include failed silently.");
        }

        doc.dispose();
        schema.dispose();
    } catch (err) {
        console.error("EXCEPTION in Test 1/2 (Likely failed to resolve base.xsd):", err.message);
    }

    // =========================================================================
    // TEST 3: Broken XML Crash Resistance
    // =========================================================================
    console.log("\n--- TEST 3: Broken XML Handling ---");
    try {
        // User is currently typing this, hasn't closed the tag or quotes
        const brokenXml = `<proxy name="myProx`; 
        
        const doc = XmlDocument.fromString(brokenXml);
        console.log("Parse succeeded without exception. (Check if it generated a valid partial tree)");
        doc.dispose();
    } catch (err) {
        // If it throws a JS error, we caught it. If it segfaults, the process exits suddenly.
        console.log("SUCCESS: Caught broken XML as a JS Exception. (Did NOT crash the Node process)");
        console.log("Message:", err.message);
    }

    // =========================================================================
    // TEST 4: Memory Leak Detection
    // =========================================================================
    console.log("\n--- TEST 4: Memory Leak Test (10,000 Iterations) ---");
    const getMemoryMB = () => Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    const startMem = getMemoryMB();
    console.log(`Starting memory: ${startMem} MB`);
    
    for (let i = 0; i < 10000; i++) {
        const doc = XmlDocument.fromString(`<test id="${i}">valid xml</test>`);
        // If you comment out doc.dispose(), you will see the memory explode here.
        doc.dispose(); 
    }
    
    // Force garbage collection if running with node --expose-gc
    if (global.gc) { global.gc(); } 
    
    const endMem = getMemoryMB();
    console.log(`Ending memory: ${endMem} MB`);
    
    if (endMem > startMem + 50) { // arbitrary threshold, e.g., 50MB growth
        console.log("FAIL: Continuous memory growth detected! (Potential Leak)");
    } else {
        console.log("SUCCESS: dispose() successfully prevents memory leaks.");
    }
}

runTests();
