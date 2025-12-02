// Test full AI Provider Manager workflow
const aiProviderManager = require('./ai-provider-manager');

console.log('🚀 Testing Full AI Provider Manager Workflow...\n');

// Test 1: Reset to initial state
console.log('🔄 Resetting to initial state...');
aiProviderManager.resetAllProviders();
let status = aiProviderManager.getProviderStatus();
console.log(`Initial Provider: ${status.currentProvider}`);

// Test 2: Simulate Gemini errors to trigger switch
console.log('\n❌ Simulating Gemini errors...');
for (let i = 1; i <= 3; i++) {
    aiProviderManager.handleProviderError('gemini', new Error(`Gemini error ${i}`));
    console.log(`Error ${i}: Provider = ${aiProviderManager.getCurrentProvider()}`);
}

// Test 3: Check status after switch
status = aiProviderManager.getProviderStatus();
console.log(`\n📊 After Gemini failure:`);
console.log(`Current Provider: ${status.currentProvider}`);
console.log(`Gemini Status: ${status.providers.gemini.status}`);
console.log(`OpenRouter Status: ${status.providers.openrouter.status}`);

// Test 4: Simulate OpenRouter errors
console.log('\n❌ Simulating OpenRouter errors...');
for (let i = 1; i <= 3; i++) {
    aiProviderManager.handleProviderError('openrouter', new Error(`OpenRouter error ${i}`));
    console.log(`Error ${i}: Provider = ${aiProviderManager.getCurrentProvider()}`);
}

// Test 5: Check final status
status = aiProviderManager.getProviderStatus();
console.log(`\n📊 After OpenRouter failure:`);
console.log(`Current Provider: ${status.currentProvider}`);
console.log(`Gemini Status: ${status.providers.gemini.status}`);
console.log(`OpenRouter Status: ${status.providers.openrouter.status}`);
console.log(`HuggingFace Status: ${status.providers.huggingface.status}`);

// Test 6: Simulate 2 hours passing
console.log('\n⏰ Simulating 2 hours passing...');
// Manually expire Gemini cooldown
status.providers.gemini.cooldownUntil = Date.now() - 1000;
console.log('✅ Gemini cooldown expired');

// Test 7: Check if should switch back
console.log('\n🔄 Checking for Gemini switch...');
const shouldSwitch = aiProviderManager.shouldSwitchBackToGemini();
console.log(`Should switch back: ${shouldSwitch}`);

// Test 8: Force switch back
console.log('\n🔄 Forcing switch back to Gemini...');
const switched = aiProviderManager.checkForGeminiSwitch();
console.log(`Switched back: ${switched}`);

// Test 9: Final status
status = aiProviderManager.getProviderStatus();
console.log(`\n📊 Final Status:`);
console.log(`Current Provider: ${status.currentProvider}`);
console.log(`Gemini Status: ${status.providers.gemini.status}`);
console.log(`OpenRouter Status: ${status.providers.openrouter.status}`);
console.log(`HuggingFace Status: ${status.providers.huggingface.status}`);

console.log('\n✅ Full workflow test completed!');
