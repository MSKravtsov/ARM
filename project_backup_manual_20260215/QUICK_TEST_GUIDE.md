# Quick Test Guide - Pulse Widget

**URL:** http://localhost:4000
**Duration:** ~10 minutes

---

## 🚀 Quick Start (3 Steps)

### 1. Create Test Profile
```
Navigate to: http://localhost:4000/en/setup
Add 2-3 subjects with grades
Click "Calculate Risk"
```

### 2. Open Pulse Widget
```
Look for FAB in bottom-right corner
Click to expand
```

### 3. Test All Modules
```
✓ Drag "The Squeeze" slider (0-40h)
✓ Click Sleep buttons (< 5h, 5-7h, > 7h)
✓ Click Energy buttons (Low, Good, High)
✓ Change Target GPA (1.0-4.0)
✓ Select subject from Nemesis dropdown
✓ Watch risk badge update in real-time
```

---

## ✅ Critical Checks (5 items)

- [ ] FAB visible and breathing
- [ ] Widget expands smoothly
- [ ] Slider track changes color (Green→Yellow→Red)
- [ ] Risk badge updates instantly
- [ ] All touch targets work on mobile

---

## 🐛 Quick Bug Report Template

**Issue:** ________________________________
**Browser:** ____________________________
**Steps to reproduce:** _________________
________________________________________
**Expected:** ___________________________
**Actual:** _____________________________

---

## 📱 Mobile Test (30 seconds)

```
1. Open DevTools (F12)
2. Toggle device mode (Cmd+Shift+M)
3. Select iPhone
4. Click FAB → Bottom sheet appears
5. Test slider thumb (should be easy to drag)
6. Click backdrop to close
```

---

## 🎯 Expected Risk Levels

| Conditions | Risk Level | Color |
|------------|-----------|-------|
| Sleep > 7h, Hours < 12, Gap < 0.5 | LOW | Green |
| Any single warning | MODERATE | Orange |
| Sleep < 5h OR Hours > 20 OR Gap > 2.0 | HIGH | Red |

---

**Pass Criteria:** All 5 critical checks ✅

Full testing guide: `USER_TESTING_PULSE_WIDGET.md`
