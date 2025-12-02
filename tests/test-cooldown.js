// Test cooldown mechanism
const aiProviderManager = require('./ai-provider-manager');

console.log('⏰ Testing Cooldown Mechanism...\n');

// Test 1: Check current status
console.log('📊 Current Status:');
const currentStatus = aiProviderManager.getProviderStatus();
console.log(`Current Provider: ${currentStatus.currentProvider}`);
console.log(`Gemini Status: ${currentStatus.providers.gemini.status}`);
console.log(`Gemini Cooldown Until: ${currentStatus.providers.gemini.cooldownUntil}`);

// Test 2: Simulate time passing (manually expire cooldown)
console.log('\n🕐 Simulating 2 hours passing...');
const providerStatus = aiProviderManager.getProviderStatus();
if (providerStatus.providers.gemini.cooldownUntil) {
    // Set cooldown to 1 second ago (expired)
    providerStatus.providers.gemini.cooldownUntil = Date.now() - 1000;
    console.log('✅ Gemini cooldown manually expired');
}

// Test 3: Check if should switch back
console.log('\n🔄 Checking if should switch back to Gemini...');
const shouldSwitch = aiProviderManager.shouldSwitchBackToGemini();
console.log(`Should switch back: ${shouldSwitch}`);

// Test 4: Force check for Gemini switch
console.log('\n🔄 Forcing check for Gemini switch...');
const switched = aiProviderManager.checkForGeminiSwitch();
console.log(`Switched back to Gemini: ${switched}`);

// Test 5: Check final status
console.log('\n📊 Final Status:');
const finalStatus = aiProviderManager.getProviderStatus();
console.log(`Current Provider: ${finalStatus.currentProvider}`);
console.log(`Gemini Status: ${finalStatus.providers.gemini.status}`);
console.log(`OpenRouter Status: ${finalStatus.providers.openrouter.status}`);

console.log('\n✅ Cooldown test completed!');
