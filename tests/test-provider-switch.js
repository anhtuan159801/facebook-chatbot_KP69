// Use dynamic import for node-fetch

async function testProviderSwitch() {
    console.log('🧪 Testing AI Provider Switch...\n');
    
    try {
        // Import fetch dynamically
        const fetch = (await import('node-fetch')).default;
        
        // Test 1: Check initial status
        console.log('📊 Initial Status:');
        const initialResponse = await fetch('http://localhost:3001/ai-provider-status');
        const initialStatus = await initialResponse.json();
        console.log(`Current Provider: ${initialStatus.currentProvider}`);
        console.log(`Gemini Error Count: ${initialStatus.providers.gemini.errorCount}`);
        
        // Test 2: Send multiple requests to trigger Gemini errors
        console.log('\n❌ Sending requests to trigger Gemini 429 errors...');
        
        for (let i = 1; i <= 5; i++) {
            try {
                const body = {
                    object: "page",
                    entry: [{
                        id: "PAGE_ID",
                        time: 1234567890,
                        messaging: [{
                            sender: { id: "7364713036916648" },
                            recipient: { id: "PAGE_ID" },
                            timestamp: 1234567890,
                            message: {
                                mid: `mid.${i}`,
                                text: `Test message ${i} - This should trigger Gemini 429 error`
                            }
                        }]
                    }]
                };
                
                const response = await fetch('http://localhost:3000/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                console.log(`Request ${i}: Status ${response.status}`);
                
                // Wait a bit between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`Request ${i} failed:`, error.message);
            }
        }
        
        // Test 3: Check status after errors
        console.log('\n📊 Status after errors:');
        const afterResponse = await fetch('http://localhost:3001/ai-provider-status');
        const afterStatus = await afterResponse.json();
        console.log(`Current Provider: ${afterStatus.currentProvider}`);
        console.log(`Gemini Error Count: ${afterStatus.providers.gemini.errorCount}`);
        console.log(`Gemini Status: ${afterStatus.providers.gemini.status}`);
        console.log(`OpenRouter Status: ${afterStatus.providers.openrouter.status}`);
        
        // Test 4: Send one more request to see which provider is used
        console.log('\n🔄 Sending final test request...');
        const finalBody = {
            object: "page",
            entry: [{
                id: "PAGE_ID",
                time: 1234567890,
                messaging: [{
                    sender: { id: "7364713036916648" },
                    recipient: { id: "PAGE_ID" },
                    timestamp: 1234567890,
                    message: {
                        mid: "mid.final",
                        text: "Final test message"
                    }
                }]
            }]
        };
        
        const finalResponse = await fetch('http://localhost:3000/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBody)
        });
        
        console.log(`Final request status: ${finalResponse.status}`);
        
        // Test 5: Check final status
        console.log('\n📊 Final Status:');
        const finalStatusResponse = await fetch('http://localhost:3001/ai-provider-status');
        const finalStatus = await finalStatusResponse.json();
        console.log(`Current Provider: ${finalStatus.currentProvider}`);
        console.log(`Gemini Error Count: ${finalStatus.providers.gemini.errorCount}`);
        console.log(`OpenRouter Error Count: ${finalStatus.providers.openrouter.errorCount}`);
        
        console.log('\n✅ Provider switch test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testProviderSwitch();
