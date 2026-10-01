import { validateAllTranslations } from '../src/lib/validateTranslations';
import { getTranslation, t, formatCurrency, formatDate } from '../src/lib/translations';

console.log('================================================================');
console.log('🌐 Farm2Home Localization System Verification');
console.log('================================================================\n');

const reports = validateAllTranslations();
let hasErrors = false;

for (const [lang, report] of Object.entries(reports)) {
  console.log(`Checking [${lang.toUpperCase()}] dictionary:`);
  console.log(`  Missing keys: ${report.missingKeys.length}`);
  console.log(`  Empty keys: ${report.emptyKeys.length}`);

  if (report.missingKeys.length > 0) {
    console.error(`  ❌ Missing in ${lang}:`, report.missingKeys.slice(0, 10));
    hasErrors = true;
  }
  if (report.emptyKeys.length > 0) {
    console.warn(`  ⚠️ Empty in ${lang}:`, report.emptyKeys.slice(0, 10));
  }
  if (report.missingKeys.length === 0 && report.emptyKeys.length === 0) {
    console.log(`  ✓ 100% complete matching English baseline.`);
  }
}

console.log('\n--- Testing Proxy Fallback Behavior ---');
const teDict = getTranslation('te');
console.log('Telugu header.browseProduce:', teDict.header.browseProduce);
console.log('Telugu cropPlanner.title:', teDict.cropPlanner.title);
console.log('Telugu weather.whatsHappening:', teDict.weather.whatsHappening);
console.log('Telugu auth.accessAccount:', teDict.auth.accessAccount);
console.log('Telugu delivery.todaysEarnings:', teDict.delivery.todaysEarnings);

// Test parameter interpolation
const testParam = t('te', 'customer.addedToCart', { item: 'Tomato' });
console.log('Interpolated addedToCart in Telugu:', testParam);

// Test fallback for nonexistent key
const testFallback = t('te', 'nonexistent.dummy.key');
console.log('Fallback nonexistent key:', testFallback);

// Test currency formatting
console.log('Currency formatting (1250):', formatCurrency(1250, 'te'));

// Test date formatting
console.log('Date formatting:', formatDate('2026-10-01', 'te'));

if (hasErrors) {
  console.error('\n❌ LOCALIZATION VERIFICATION FAILED WITH MISSING KEYS!');
  process.exit(1);
} else {
  console.log('\n🎉 ALL LOCALIZATION SYSTEM TESTS PASSED SUCCESSFULLY! 🎉');
}
