const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const BranchOrder = require('../models/BranchOrder');
const Menu = require('../models/Menu');
const { authenticate, requireHead } = require('../middleware/auth');

/**
 * Helper: Resolve start and end dates based on timeframe parameter
 */
function resolveDateRange(timeframe, customStart, customEnd) {
  const now = new Date();
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (timeframe === 'week') {
    startDate.setDate(startDate.getDate() - 6); // 7 days inclusive
  } else if (timeframe === 'month') {
    startDate.setDate(startDate.getDate() - 29); // 30 days inclusive
  } else if (timeframe === 'year') {
    startDate.setFullYear(startDate.getFullYear() - 1); // 365 days
  } else if (timeframe === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart + 'T00:00:00');
    endDate = new Date(customEnd + 'T23:59:59.999');
  } else {
    // Default to month
    startDate.setDate(startDate.getDate() - 29);
  }

  return { startDate, endDate };
}

// @route   GET /api/reports/analytics
// @desc    Generate comprehensive canteen report metrics across all 4 pillars
// @access  Protected (Head only)
router.get('/analytics', authenticate, requireHead, async (req, res) => {
  try {
    const { timeframe = 'month', startDate: qStart, endDate: qEnd } = req.query;
    const { startDate, endDate } = resolveDateRange(timeframe, qStart, qEnd);
    const daysInPeriod = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));

    // 1. INVENTORY VALUATION & CURRENT STATUS
    const inventoryItems = await Inventory.find({ isArchived: false }).lean();
    let totalInventoryValuation = 0;
    const categoryValuationMap = {};

    inventoryItems.forEach((item) => {
      const price = Number(item.unitPrice) || 0;
      const qty = Number(item.currentQuantity) || 0;
      const val = Number((price * qty).toFixed(2));
      totalInventoryValuation += val;

      const cat = item.category || 'General Groceries';
      if (!categoryValuationMap[cat]) {
        categoryValuationMap[cat] = { category: cat, totalValue: 0, itemsCount: 0 };
      }
      categoryValuationMap[cat].totalValue += val;
      categoryValuationMap[cat].itemsCount += 1;
    });

    // 2. STOCK MOVEMENTS & INVENTORY CONSUMPTION IN TIMEFRAME
    const movements = await StockMovement.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    let totalRestockSpend = 0;
    let totalConsumptionCost = 0;
    const itemConsumptionMap = new Map();

    movements.forEach((m) => {
      const invId = m.inventoryItem ? m.inventoryItem.toString() : null;
      const matchedInv = inventoryItems.find((i) => i._id.toString() === invId);
      const unitPrice = matchedInv ? (Number(matchedInv.unitPrice) || 0) : 0;
      const qty = Math.abs(Number(m.changeQuantity) || 0);
      const cost = Number((qty * unitPrice).toFixed(2));

      if (m.movementType === 'received') {
        totalRestockSpend += cost;
      } else if (m.movementType === 'consumed') {
        totalConsumptionCost += cost;

        const key = m.itemNameSnapshot || (matchedInv ? matchedInv.name : 'Unknown Item');
        if (!itemConsumptionMap.has(key)) {
          itemConsumptionMap.set(key, {
            name: key,
            category: matchedInv ? matchedInv.category : 'General Groceries',
            unit: m.unit || (matchedInv ? matchedInv.unit : 'kg'),
            consumedQty: 0,
            consumedCost: 0,
            currentStock: matchedInv ? matchedInv.currentQuantity : 0,
            unitPrice,
            minThreshold: matchedInv ? matchedInv.minThreshold : 5,
          });
        }
        const record = itemConsumptionMap.get(key);
        record.consumedQty = Number((record.consumedQty + qty).toFixed(2));
        record.consumedCost = Number((record.consumedCost + cost).toFixed(2));
      }
    });

    // Compute consumption rates, daily burn rate, and days of stock remaining
    const consumptionRateList = [];
    itemConsumptionMap.forEach((val) => {
      const dailyBurnRate = Number((val.consumedQty / daysInPeriod).toFixed(2));
      const daysRemaining = dailyBurnRate > 0 ? Number((val.currentStock / dailyBurnRate).toFixed(1)) : 999;
      let stockStatus = 'Adequate';
      if (daysRemaining <= 3) stockStatus = 'Critical';
      else if (daysRemaining <= 7) stockStatus = 'Low';

      consumptionRateList.push({
        ...val,
        dailyBurnRate,
        daysRemaining,
        stockStatus,
      });
    });

    // Sort consumption list by burn rate descending
    consumptionRateList.sort((a, b) => b.consumedQty - a.consumedQty);

    // 3. PEOPLE EATING IN CANTEEN (DINERS & HEADCOUNTS)
    const branchOrders = await BranchOrder.find({}).lean();
    let totalPeopleFed = 0;
    const sessionTotals = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
    const branchHeadcountsMap = {
      head_office: { name: 'Head Office', nameKn: 'ಪ್ರಧಾನ ಕಚೇರಿ', breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 },
      mudranalaya: { name: 'Mudranalaya', nameKn: 'ಮುದ್ರಣಾಲಯ', breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 },
      blood_bank: { name: 'Blood Bank', nameKn: 'ರಕ್ತನಿಧಿ', breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 },
      samraksha: { name: 'Samraksha', nameKn: 'ಸಂರಕ್ಷಾ', breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 },
      ashtanga_yoga: { name: 'Ashtanga Yoga', nameKn: 'ಅಷ್ಟಾಂಗ ಯೋಗ', breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 },
    };

    // Build day-by-day time series map
    const dailyDinersTimeSeriesMap = {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      dailyDinersTimeSeriesMap[dStr] = { date: dStr, breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 };
    }

    // Process recurring deductions history and active headcounts
    branchOrders.forEach((bo) => {
      if (bo.orderType === 'daily_recurring' && bo.dailyRecurring) {
        const dr = bo.dailyRecurring;
        const bId = bo.branchId;
        const bTarget = branchHeadcountsMap[bId] || { name: bo.branchNameEn, nameKn: bo.branchNameKn, breakfast: 0, lunch: 0, snacks: 0, dinner: 0, total: 0 };

        // Deductions in range
        (dr.deductionsHistory || []).forEach((dh) => {
          if (dh.date && dh.date >= startDate.toISOString().split('T')[0] && dh.date <= endDate.toISOString().split('T')[0]) {
            const count = Number(dh.peopleCount) || 0;
            const sess = (dh.mealSession || 'Lunch').toLowerCase();
            totalPeopleFed += count;

            if (sessionTotals[sess] !== undefined) sessionTotals[sess] += count;
            if (bTarget[sess] !== undefined) bTarget[sess] += count;
            bTarget.total += count;

            if (dailyDinersTimeSeriesMap[dh.date]) {
              if (dailyDinersTimeSeriesMap[dh.date][sess] !== undefined) {
                dailyDinersTimeSeriesMap[dh.date][sess] += count;
              }
              dailyDinersTimeSeriesMap[dh.date].total += count;
            }
          }
        });
      }
    });

    // Special event orders approved in timeframe
    const specialEventsList = [];
    branchOrders.forEach((bo) => {
      if (bo.orderType === 'special_event' && bo.specialEvent) {
        const se = bo.specialEvent;
        if (se.eventDate && se.eventDate >= startDate.toISOString().split('T')[0] && se.eventDate <= endDate.toISOString().split('T')[0]) {
          const count = Number(se.peopleCount) || 0;
          if (bo.status === 'stock_deducted' || bo.status === 'approved') {
            totalPeopleFed += count;
            const sess = (se.mealSession || 'Lunch').toLowerCase();
            if (sessionTotals[sess] !== undefined) sessionTotals[sess] += count;

            if (dailyDinersTimeSeriesMap[se.eventDate]) {
              if (dailyDinersTimeSeriesMap[se.eventDate][sess] !== undefined) {
                dailyDinersTimeSeriesMap[se.eventDate][sess] += count;
              }
              dailyDinersTimeSeriesMap[se.eventDate].total += count;
            }
          }

          specialEventsList.push({
            id: bo._id,
            eventName: se.eventName,
            branchNameEn: bo.branchNameEn,
            branchNameKn: bo.branchNameKn,
            eventDate: se.eventDate,
            mealSession: se.mealSession,
            peopleCount: count,
            status: bo.status,
            requestedDishes: se.requestedDishes || [],
          });
        }
      }
    });

    // 4. FOOD WASTAGE OF FOOD ITEMS
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const menus = await Menu.find({
      date: { $gte: startStr, $lte: endStr },
    }).lean();

    let totalWastageQuantity = 0;
    const dishWastageMap = new Map();
    const wastageReasonsMap = {};
    const wastageAuditRecords = [];

    menus.forEach((menu) => {
      (menu.items || []).forEach((dish) => {
        const w = dish.wastage;
        if (w && Number(w.quantity) > 0) {
          const qty = Number(w.quantity);
          const unit = w.unit || 'kg';
          const reason = w.reason || 'Surplus / Excess Preparation';
          totalWastageQuantity += qty;

          // Track reasons
          wastageReasonsMap[reason] = (wastageReasonsMap[reason] || 0) + qty;

          // Track by dish
          const dName = dish.nameEn || dish.name || dish.nameKn || 'Unknown Dish';
          if (!dishWastageMap.has(dName)) {
            dishWastageMap.set(dName, {
              dishName: dName,
              dishNameKn: dish.nameKn || '',
              category: dish.category,
              quantity: 0,
              unit,
              reasons: new Set(),
            });
          }
          const dw = dishWastageMap.get(dName);
          dw.quantity = Number((dw.quantity + qty).toFixed(2));
          dw.reasons.add(reason);

          wastageAuditRecords.push({
            date: menu.date,
            dishName: dName,
            dishNameKn: dish.nameKn || '',
            category: dish.category,
            quantity: qty,
            unit,
            reason,
            recordedBy: w.recordedBy || 'Canteen Staff',
          });
        }
      });
    });

    const topWastedDishes = Array.from(dishWastageMap.values())
      .map((d) => ({ ...d, reasons: Array.from(d.reasons).join(', ') }))
      .sort((a, b) => b.quantity - a.quantity);

    // Wastage reason distribution array
    const wastageByReason = Object.keys(wastageReasonsMap).map((r) => ({
      reason: r,
      quantity: Number(wastageReasonsMap[r].toFixed(2)),
    })).sort((a, b) => b.quantity - a.quantity);

    res.json({
      success: true,
      timeframe,
      dateRange: {
        startDate: startStr,
        endDate: endStr,
        daysInPeriod,
      },
      summaryCards: {
        totalInventoryValuation: Number(totalInventoryValuation.toFixed(2)),
        totalRestockSpend: Number(totalRestockSpend.toFixed(2)),
        totalConsumptionCost: Number(totalConsumptionCost.toFixed(2)),
        totalPeopleFed,
        totalWastageQuantity: Number(totalWastageQuantity.toFixed(2)),
        activeInventoryItemsCount: inventoryItems.length,
      },
      inventoryPillar: {
        totalInventoryValuation: Number(totalInventoryValuation.toFixed(2)),
        totalRestockSpend: Number(totalRestockSpend.toFixed(2)),
        totalConsumptionCost: Number(totalConsumptionCost.toFixed(2)),
        categoryValuation: Object.values(categoryValuationMap),
        consumptionRates: consumptionRateList,
      },
      dinersPillar: {
        totalPeopleFed,
        sessionTotals,
        branchBreakdown: Object.values(branchHeadcountsMap),
        dailyDinersTimeSeries: Object.values(dailyDinersTimeSeriesMap),
        specialEvents: specialEventsList,
      },
      wastagePillar: {
        totalWastageQuantity: Number(totalWastageQuantity.toFixed(2)),
        topWastedDishes,
        wastageByReason,
        wastageAuditRecords: wastageAuditRecords.sort((a, b) => new Date(b.date) - new Date(a.date)),
      },
    });
  } catch (error) {
    console.error('[Reports Analytics Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/reports/export-csv
// @desc    Download formatted CSV spreadsheet report
// @access  Protected (Head only)
router.get('/export-csv', authenticate, requireHead, async (req, res) => {
  try {
    const { timeframe = 'month', startDate: qStart, endDate: qEnd } = req.query;
    const { startDate, endDate } = resolveDateRange(timeframe, qStart, qEnd);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Fetch data
    const inventoryItems = await Inventory.find({ isArchived: false }).lean();
    const movements = await StockMovement.find({ createdAt: { $gte: startDate, $lte: endDate } }).lean();
    const menus = await Menu.find({ date: { $gte: startStr, $lte: endStr } }).lean();
    const branchOrders = await BranchOrder.find({}).lean();

    // Summary calculations
    let totalInvVal = 0;
    inventoryItems.forEach((it) => {
      totalInvVal += (Number(it.unitPrice) || 0) * (Number(it.currentQuantity) || 0);
    });

    let totalRestock = 0;
    let totalConsumed = 0;
    movements.forEach((m) => {
      const inv = inventoryItems.find((i) => i._id.toString() === (m.inventoryItem ? m.inventoryItem.toString() : ''));
      const price = inv ? (Number(inv.unitPrice) || 0) : 0;
      const qty = Math.abs(Number(m.changeQuantity) || 0);
      if (m.movementType === 'received') totalRestock += qty * price;
      else if (m.movementType === 'consumed') totalConsumed += qty * price;
    });

    let totalDiners = 0;
    const branchCounts = {
      head_office: { name: 'Head Office', total: 0, b: 0, l: 0, s: 0, d: 0 },
      mudranalaya: { name: 'Mudranalaya', total: 0, b: 0, l: 0, s: 0, d: 0 },
      blood_bank: { name: 'Blood Bank', total: 0, b: 0, l: 0, s: 0, d: 0 },
      samraksha: { name: 'Samraksha', total: 0, b: 0, l: 0, s: 0, d: 0 },
      ashtanga_yoga: { name: 'Ashtanga Yoga', total: 0, b: 0, l: 0, s: 0, d: 0 },
    };

    branchOrders.forEach((bo) => {
      if (bo.orderType === 'daily_recurring' && bo.dailyRecurring?.deductionsHistory) {
        const b = branchCounts[bo.branchId] || { name: bo.branchNameEn || bo.branchId, total: 0, b: 0, l: 0, s: 0, d: 0 };
        bo.dailyRecurring.deductionsHistory.forEach((dh) => {
          if (dh.date >= startStr && dh.date <= endStr) {
            const c = Number(dh.peopleCount) || 0;
            totalDiners += c;
            b.total += c;
            const sess = (dh.mealSession || '').toLowerCase();
            if (sess === 'breakfast') b.b += c;
            else if (sess === 'lunch') b.l += c;
            else if (sess.includes('snack')) b.s += c;
            else if (sess === 'dinner') b.d += c;
          }
        });
      }
    });

    let totalWaste = 0;
    menus.forEach((menu) => {
      (menu.items || []).forEach((d) => {
        if (d.wastage && Number(d.wastage.quantity) > 0) totalWaste += Number(d.wastage.quantity);
      });
    });

    // Excel-compatible UTF-8 BOM
    let csv = '\uFEFF';
    csv += `RASHTROTTHANA PARISHATH - CANTEEN MANAGEMENT AUDIT REPORT\n`;
    csv += `Period,${startStr} to ${endStr} (${timeframe.toUpperCase()})\n`;
    csv += `Generated On,${new Date().toLocaleString()}\n\n`;

    // Executive Summary
    csv += `EXECUTIVE SUMMARY\n`;
    csv += `Current Store Inventory Valuation (INR),${totalInvVal.toFixed(2)}\n`;
    csv += `Restock Purchase Spend in Period (INR),${totalRestock.toFixed(2)}\n`;
    csv += `Cooking Ingredient Consumption Cost (INR),${totalConsumed.toFixed(2)}\n`;
    csv += `Total People Fed (Diners),${totalDiners}\n`;
    csv += `Total Food Wastage Recorded (kg),${totalWaste.toFixed(2)}\n\n`;

    // 1. Inventory Consumption & Cost of Items
    csv += `1. INVENTORY CONSUMPTION & COST OF ITEMS\n`;
    csv += `Item Name,Category,Unit,Current Stock,Used in Period,Unit Price (INR),Total Consumed Cost (INR)\n`;
    inventoryItems.forEach((inv) => {
      const itemMovements = movements.filter(
        (m) => m.inventoryItem && m.inventoryItem.toString() === inv._id.toString() && m.movementType === 'consumed'
      );
      const usedQty = itemMovements.reduce((sum, m) => sum + Math.abs(m.changeQuantity || 0), 0);
      const cost = usedQty * (inv.unitPrice || 0);
      csv += `"${inv.name}","${inv.category}","${inv.unit}",${inv.currentQuantity},${usedQty.toFixed(2)},${inv.unitPrice || 0},${cost.toFixed(2)}\n`;
    });
    csv += `\n`;

    // 2. Branch Dining Headcounts
    csv += `2. BRANCH DINING DISTRIBUTION & PEOPLE FED\n`;
    csv += `Branch Name,Breakfast,Lunch,Evening Snacks,Dinner,Total Meals Served\n`;
    Object.values(branchCounts).forEach((bc) => {
      csv += `"${bc.name}",${bc.b},${bc.l},${bc.s},${bc.d},${bc.total}\n`;
    });
    csv += `\n`;

    // 3. Food Wastage Records
    csv += `3. FOOD WASTAGE RECORDS\n`;
    csv += `Date,Dish Name,Category,Quantity Wasted,Unit,Reason,Recorded By\n`;
    menus.forEach((menu) => {
      (menu.items || []).forEach((dish) => {
        if (dish.wastage && Number(dish.wastage.quantity) > 0) {
          csv += `"${menu.date}","${dish.nameEn || dish.name || dish.nameKn}","${dish.category}",${dish.wastage.quantity},"${dish.wastage.unit || 'kg'}","${dish.wastage.reason || ''}","${dish.wastage.recordedBy || ''}"\n`;
        }
      });
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`RP_Canteen_Report_${startStr}_to_${endStr}.csv`);
    return res.send(Buffer.from('\uFEFF' + csv, 'utf-8'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

