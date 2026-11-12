const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const BranchOrder = require('../models/BranchOrder');

dotenv.config();
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rp_canteen';

const BRANCH_ACCOUNTS = [
  {
    username: 'headoffice',
    email: 'headoffice@rashtrotthana.org',
    fullName: 'Rashtrotthana Head Office (ಪ್ರಧಾನ ಕಚೇರಿ)',
    password: 'Branch@HO2026',
    role: 'branch',
    branchId: 'head_office',
    branchNameKn: 'ಪ್ರಧಾನ ಕಚೇರಿ',
    initialCounts: { breakfastCount: 15, lunchCount: 25, snacksCount: 10, dinnerCount: 0 },
  },
  {
    username: 'mudranalaya',
    email: 'mudranalaya@rashtrotthana.org',
    fullName: 'Rashtrotthana Mudranalaya (ಮುದ್ರಣಾಲಯ)',
    password: 'Branch@Press2026',
    role: 'branch',
    branchId: 'mudranalaya',
    branchNameKn: 'ಮುದ್ರಣಾಲಯ',
    initialCounts: { breakfastCount: 20, lunchCount: 45, snacksCount: 20, dinnerCount: 0 },
  },
  {
    username: 'bloodbank',
    email: 'bloodbank@rashtrotthana.org',
    fullName: 'Rashtrotthana Blood Centre (ರಕ್ತನಿಧಿ)',
    password: 'Branch@BB2026',
    role: 'branch',
    branchId: 'blood_bank',
    branchNameKn: 'ರಕ್ತನಿಧಿ',
    initialCounts: { breakfastCount: 10, lunchCount: 30, snacksCount: 15, dinnerCount: 0 },
  },
  {
    username: 'samraksha',
    email: 'samraksha@rashtrotthana.org',
    fullName: 'Samraksha Thalassemia Centre (ಸಂರಕ್ಷಾ)',
    password: 'Branch@Samraksha2026',
    role: 'branch',
    branchId: 'samraksha',
    branchNameKn: 'ಸಂರಕ್ಷಾ',
    initialCounts: { breakfastCount: 5, lunchCount: 15, snacksCount: 5, dinnerCount: 0 },
  },
  {
    username: 'ashtangayoga',
    email: 'yoga@rashtrotthana.org',
    fullName: 'Rashtrotthana Ashtanga Yoga (ಅಷ್ಟಾಂಗ ಯೋಗ)',
    password: 'Branch@Yoga2026',
    role: 'branch',
    branchId: 'ashtanga_yoga',
    branchNameKn: 'ಅಷ್ಟಾಂಗ ಯೋಗ',
    initialCounts: { breakfastCount: 12, lunchCount: 20, snacksCount: 12, dinnerCount: 0 },
  },
];

async function seedBranchAccounts() {
  await mongoose.connect(uri);
  console.log('[Seed] Connected to MongoDB for branch accounts...');

  for (const acc of BRANCH_ACCOUNTS) {
    let user = await User.findOne({ username: acc.username });
    if (!user) {
      user = new User({
        username: acc.username,
        email: acc.email,
        fullName: acc.fullName,
        password: acc.password,
        role: acc.role,
        branchId: acc.branchId,
        branchNameKn: acc.branchNameKn,
        isActive: true,
      });
      await user.save();
      console.log(`Created branch account: ${acc.username} (${acc.fullName})`);
    } else {
      user.role = 'branch';
      user.branchId = acc.branchId;
      user.branchNameKn = acc.branchNameKn;
      user.fullName = acc.fullName;
      await user.save();
      console.log(`Updated existing branch account: ${acc.username}`);
    }

    // Ensure initial daily recurring indent exists
    let recurring = await BranchOrder.findOne({ branchId: acc.branchId, orderType: 'daily_recurring' });
    if (!recurring) {
      await BranchOrder.create({
        branchId: acc.branchId,
        branchNameEn: acc.fullName.split('(')[0].trim(),
        branchNameKn: acc.branchNameKn,
        orderType: 'daily_recurring',
        status: 'active',
        dailyRecurring: {
          isActive: true,
          breakfastCount: acc.initialCounts.breakfastCount,
          lunchCount: acc.initialCounts.lunchCount,
          snacksCount: acc.initialCounts.snacksCount,
          dinnerCount: acc.initialCounts.dinnerCount,
          notes: 'Standard daily requirement',
        },
        createdBy: user._id,
      });
      console.log(`Initialized recurring daily order for ${acc.branchId}`);
    }
  }

  console.log('[Seed] All branch accounts and recurring orders ready!');
  await mongoose.disconnect();
  process.exit(0);
}

seedBranchAccounts().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});

