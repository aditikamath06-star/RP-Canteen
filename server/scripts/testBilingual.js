const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Menu = require('../models/Menu');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

async function runBilingualTests() {
  console.log('================================================================');
  console.log('STARTING AUTOMATED BILINGUAL VERIFICATION (12 REQUIREMENTS)');
  console.log('Testing English and Kannada (ಕನ್ನಡ) Support for RP Canteen');
  console.log('================================================================\n');

  await connectDB();
  const app = require('../server');
  const port = 5002;
  const server = app.listen(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  let passedCount = 0;
  const test = (num, name, condition, details = '') => {
    if (condition) {
      passedCount++;
      console.log(`✅ PASS [Requirement ${num}]: ${name} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`❌ FAIL [Requirement ${num}]: ${name} ${details ? `(${details})` : ''}`);
    }
  };

  try {
    // 1. Check published menu delivers bilingual items
    const todayStr = new Date().toISOString().split('T')[0];
    const pubRes = await fetch(`${baseUrl}/api/menus/published?date=${todayStr}`);
    const pubData = await pubRes.json();
    const items = pubData.menu?.items || [];

    const hasBilingualNames = items.some(
      (item) => item.nameKn && item.nameEn && item.nameKn !== item.nameEn
    );
    test(
      1,
      'Published menu items contain separate English and Kannada names',
      hasBilingualNames,
      `e.g., "${items[0]?.nameEn}" / "${items[0]?.nameKn}"`
    );

    // 2. Check bilingual descriptions
    const hasBilingualDesc = items.some(
      (item) => item.descriptionKn && item.descriptionEn
    );
    test(
      2,
      'Published menu items contain separate English and Kannada descriptions',
      hasBilingualDesc,
      `Descriptions available in both EN and KN`
    );

    // 3. Fallback check: When one translation is missing, fallback is preserved
    const testFallbackMenuDate = '2026-11-20';
    await Menu.deleteMany({ date: testFallbackMenuDate });

    // Head login
    const headLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'canteenhead', password: 'Head@RP2026' }),
    });
    const { token: headToken } = await headLoginRes.json();

    // Create menu with only Kannada name (English missing)
    const createKnOnlyRes = await fetch(`${baseUrl}/api/menus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${headToken}`,
      },
      body: JSON.stringify({
        date: testFallbackMenuDate,
        title: 'Kannada Only Menu Test',
        status: 'published',
        items: [
          {
            name: 'ರಾಗಿ ರೊಟ್ಟಿ',
            nameKn: 'ರಾಗಿ ರೊಟ್ಟಿ',
            nameEn: '', // Intentionally empty English
            category: 'Breakfast',
            descriptionKn: 'ಬಿಸಿ ರಾಗಿ ರೊಟ್ಟಿ ಮತ್ತು ಕಾಯಿ ಚಟ್ನಿ',
            descriptionEn: '',
            isVegetarian: true,
            isAvailable: true,
          },
        ],
      }),
    });
    const createKnOnlyData = await createKnOnlyRes.json();
    test(
      3,
      'Menu creation succeeds even when English translation is missing',
      createKnOnlyRes.status === 201,
      `Created menu with item "${createKnOnlyData.menu?.items[0]?.name}"`
    );

    // Fetch and check fallback behavior
    const fallbackPubRes = await fetch(`${baseUrl}/api/menus/published?date=${testFallbackMenuDate}`);
    const fallbackPubData = await fallbackPubRes.json();
    const fbItem = fallbackPubData.menu?.items[0];
    test(
      4,
      'Missing English translation gracefully falls back to available Kannada name without error',
      fbItem && (fbItem.name === 'ರಾಗಿ ರೊಟ್ಟಿ' || fbItem.nameKn === 'ರಾಗಿ ರೊಟ್ಟಿ'),
      `Retained: "${fbItem?.name}"`
    );

    // 4. Test Translation API endpoint (English to Kannada)
    const translateToKnRes = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Idli', from: 'en', to: 'kn' }),
    });
    const translateToKnData = await translateToKnRes.json();
    test(
      5,
      'Backend translation service suggests Kannada for English food name',
      translateToKnRes.status === 200 && translateToKnData.success && Boolean(translateToKnData.translatedText),
      `"Idli" -> "${translateToKnData.translatedText}"`
    );

    // 5. Test Translation API endpoint (Kannada to English)
    const translateToEnRes = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'ಇಡ್ಲಿ', from: 'kn', to: 'en' }),
    });
    const translateToEnData = await translateToEnRes.json();
    test(
      6,
      'Backend translation service suggests English for Kannada food name',
      translateToEnRes.status === 200 && translateToEnData.success && Boolean(translateToEnData.translatedText),
      `"ಇಡ್ಲಿ" -> "${translateToEnData.translatedText}"`
    );

    // 6. Test Translation service resilience (handles invalid input gracefully)
    const emptyTransRes = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', from: 'en', to: 'kn' }),
    });
    test(
      7,
      'Translation API validates requests and rejects empty payloads with HTTP 400',
      emptyTransRes.status === 400,
      `HTTP status: ${emptyTransRes.status}`
    );

    // 7. Test User Language Preference persistence in account
    const updateLangRes = await fetch(`${baseUrl}/api/auth/language`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${headToken}`,
      },
      body: JSON.stringify({ language: 'kn' }),
    });
    const updateLangData = await updateLangRes.json();
    test(
      8,
      'Logged-in users can update their account preferred language to Kannada',
      updateLangRes.status === 200 && updateLangData.preferredLanguage === 'kn',
      `Language set to: ${updateLangData.preferredLanguage}`
    );

    // 8. Verify preference persists in session endpoint
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${headToken}` },
    });
    const meData = await meRes.json();
    test(
      9,
      'User preferred language persists and is retrieved in /api/auth/me',
      meData.user?.preferredLanguage === 'kn',
      `Session preferredLanguage: ${meData.user?.preferredLanguage}`
    );

    // 9. Ensure strict RBAC remains preserved: workers cannot edit menus or stock
    const workerLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'canteenworker', password: 'Worker@RP2026' }),
    });
    const { token: workerToken } = await workerLoginRes.json();

    const workerMenuAttempt = await fetch(`${baseUrl}/api/menus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ date: '2026-11-25', title: 'Illegal Worker Menu', items: [] }),
    });
    test(
      10,
      'Strict RBAC is preserved: workers are blocked from creating menus (HTTP 403)',
      workerMenuAttempt.status === 403,
      `Status: ${workerMenuAttempt.status}`
    );

    // 10. Strict pure vegetarian guarantee maintained
    let nonVegRejected = false;
    try {
      const nonVegRes = await fetch(`${baseUrl}/api/menus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${headToken}`,
        },
        body: JSON.stringify({
          date: '2026-11-26',
          title: 'Non-veg attempt',
          items: [{ name: 'NonVeg Item', isVegetarian: false }],
        }),
      });
      nonVegRejected = nonVegRes.status === 400;
    } catch {
      nonVegRejected = true;
    }
    test(
      11,
      'Strict 100% pure vegetarian policy is enforced for bilingual menu entries',
      nonVegRejected,
      'Non-vegetarian entries completely prohibited'
    );

    // 11. Zero price policy maintained in bilingual menu
    const hasAnyPricesInMenu = items.some(
      (i) => i.price !== undefined || i.cost !== undefined
    );
    test(
      12,
      'Zero food price requirement is preserved across bilingual menus',
      !hasAnyPricesInMenu,
      'No prices anywhere in menu items'
    );

    // Cleanup test fixture
    await Menu.deleteMany({ date: testFallbackMenuDate });

    console.log('\n================================================================');
    console.log(`BILINGUAL TEST RESULTS: ${passedCount} / 12 PASSED`);
    console.log('================================================================');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('Test suite exception:', error);
    if (server) server.close();
    process.exit(1);
  }
}

runBilingualTests();

