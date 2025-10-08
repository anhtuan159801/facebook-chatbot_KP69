const aiProviderManager = require('./ai-provider-manager');

console.log('🧪 Testing AI Provider Manager...\n');

// Test 1: Initial state
console.log('📊 Initial Provider Status:');
console.log(JSON.stringify(aiProviderManager.getProviderStatus(), null, 2));

// Test 2: Simulate Gemini errors
console.log('\n❌ Simulating Gemini errors...');
for (let i = 1; i <= 3; i++) {
    aiProviderManager.handleProviderError('gemini', new Error(`Test error ${i}`));
    console.log(`Error ${i}: Current provider = ${aiProviderManager.getCurrentProvider()}`);
}

// Test 3: Check status after switch
console.log('\n📊 Status after Gemini failure:');
console.log(JSON.stringify(aiProviderManager.getProviderStatus(), null, 2));

// Test 4: Simulate OpenRouter errors
console.log('\n❌ Simulating OpenRouter errors...');
for (let i = 1; i <= 3; i++) {
    aiProviderManager.handleProviderError('openrouter', new Error(`Test error ${i}`));
    console.log(`Error ${i}: Current provider = ${aiProviderManager.getCurrentProvider()}`);
}

// Test 5: Check final status
console.log('\n📊 Final Status:');
console.log(JSON.stringify(aiProviderManager.getProviderStatus(), null, 2));

// Test 6: Reset and test cooldown
console.log('\n🔄 Resetting all providers...');
aiProviderManager.resetAllProviders();
console.log('Current provider after reset:', aiProviderManager.getCurrentProvider());

// Test 7: Simulate time passing (cooldown test)
console.log('\n⏰ Testing cooldown mechanism...');
aiProviderManager.handleProviderError('gemini', new Error('Test error'));
console.log('After Gemini error:', aiProviderManager.getCurrentProvider());

// Simulate 2 hours passing by manually setting cooldown
const providerStatus = aiProviderManager.getProviderStatus();
providerStatus.providers.gemini.cooldownUntil = Date.now() - 1000; // 1 second ago (expired)

console.log('After cooldown expired, should switch back to Gemini:');
console.log('Should switch back:', aiProviderManager.shouldSwitchBackToGemini());

console.log('\n✅ AI Provider Manager test completed!');
