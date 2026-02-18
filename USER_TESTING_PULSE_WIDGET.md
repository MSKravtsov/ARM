# ARM Psychosocial Pulse Widget - User Testing Guide

**Version:** 1.0
**Date:** February 14, 2026
**Feature:** Psychosocial Risk Assessment Widget
**Test Environment:** http://localhost:4000

---

## 📋 Overview

This document provides comprehensive testing instructions for the newly implemented **Psychosocial Pulse Widget** on the ARM Report page. The widget assesses "soft" risk factors (burnout, stress, pressure) alongside academic performance.

---

## 🎯 Feature Summary

The Pulse Widget is a floating component that:
- Appears fixed in the bottom-right corner of the report page
- Provides 4 input modules for psychosocial data collection
- Calculates real-time risk assessment (Low/Moderate/High)
- Adapts responsively between desktop and mobile layouts

---

## 🚀 Pre-Test Setup

### 1. Start the Application

```bash
# Navigate to project directory
cd /Users/kms227/Desktop/Private/Antigravity/ARMv1

# Ensure dev server is running
npm run dev

# Expected output: "ready - started server on 0.0.0.0:4000"
```

### 2. Clear Browser Cache (Recommended)

- **Chrome:** Cmd+Shift+Delete → Clear cached images and files
- **Safari:** Cmd+Option+E
- **Firefox:** Cmd+Shift+Delete → Cache

### 3. Create Test Profile

Navigate to: http://localhost:4000/en/setup

**Sample Test Data:**

| Subject | Type | Semester Grades (Q1.1, Q1.2, Q2.1, Q2.2) | Exam Subject |
|---------|------|------------------------------------------|--------------|
| Mathematics | LK | 12, 11, 10, 9 | Yes (Written) |
| Physics | LK | 10, 9, 8, 7 | Yes (Written) |
| English | GK | 13, 14, 13, 12 | Yes (Oral) |
| German | GK | 11, 10, 11, 10 | Yes (Written) |
| History | GK | 8, 9, 9, 8 | No |

Click **"Calculate Risk"** to navigate to the report page.

---

## 🧪 Test Scenarios

### **Test 1: Widget Visibility & Initial State**

**Objective:** Verify the widget appears correctly in its collapsed state.

**Steps:**
1. Load the report page: http://localhost:4000/en/report
2. Scroll to ensure full page is visible

**Expected Behavior:**
- ✅ Floating Action Button (FAB) visible in **bottom-right corner**
- ✅ FAB displays **heart icon** + **"Pulse Check"** text
- ✅ FAB has **colored ring** (green/orange/red based on default risk)
- ✅ **Breathing animation** (subtle scale 1.0 → 1.05) every 5 seconds
- ✅ FAB stays fixed when scrolling the page

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 2: Expand Widget (Desktop)**

**Viewport:** Desktop (1920x1080 or similar)

**Steps:**
1. Click the FAB button

**Expected Behavior:**
- ✅ Floating card appears **above the FAB** (not covering it)
- ✅ Card width: ~420px
- ✅ **Glassmorphism effect:** blurred background, semi-transparent white
- ✅ **Header:** "Stress & Balance" with animated dot + close button (X)
- ✅ **Risk Summary Badge** displays current risk level
- ✅ Smooth animation (0.3s ease-out, scale + fade)

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 3: Expand Widget (Mobile)**

**Viewport:** iPhone 14 Pro (430x932) or use Chrome DevTools

**Steps:**
1. Open DevTools (F12) → Toggle Device Toolbar (Cmd+Shift+M)
2. Select "iPhone 14 Pro" or similar device
3. Click the FAB button

**Expected Behavior:**
- ✅ **Bottom sheet** slides up from bottom edge
- ✅ Rounded top corners (`rounded-t-3xl`)
- ✅ **Backdrop overlay** appears (blurred, darkened)
- ✅ Card covers ~85% of viewport height
- ✅ **Scrollable content** if height exceeds viewport
- ✅ Clicking backdrop **closes** the widget

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 4: Module 1 - "The Squeeze" (Range Slider)**

**Objective:** Test weekly commitments slider functionality.

**Steps:**
1. Expand the widget
2. Locate the **"The Squeeze"** slider
3. Drag the slider thumb from left to right

**Expected Behavior:**

| Slider Value | Track Color | Expected State |
|--------------|-------------|----------------|
| 0-10 hours | Green | Safe zone |
| 11-20 hours | Yellow/Amber | Warning zone |
| 21-40 hours | Red | Danger zone |

- ✅ Slider thumb is **44x44px** (easy to grab on mobile)
- ✅ Current value displayed below slider: **"X h / week"**
- ✅ Track color **changes dynamically** as you drag
- ✅ **Smooth movement** (60fps, no lag)
- ✅ Thumb has **hover effect** (scales 1.1x on hover)
- ✅ Thumb has **active effect** (scales 0.95x on click)

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 5: Module 2 - "Recovery Debt" (Segmented Controls)**

**Objective:** Test sleep and energy level inputs.

**Steps:**
1. Click each button in the **Sleep** row
2. Click each button in the **Energy** row

**Expected Behavior:**

**Sleep Controls:**
- ✅ Three buttons: `< 5h`, `5-7h`, `> 7h`
- ✅ Selected button: **orange background** + white text + shadow
- ✅ Unselected buttons: gray background + dark text
- ✅ Only **one button** selected at a time (radio behavior)
- ✅ Smooth color transition on selection

**Energy Controls:**
- ✅ Three buttons with emojis: `🪫 Low`, `🔋 Good`, `⚡ High`
- ✅ Same selection behavior as Sleep
- ✅ Emojis render correctly across browsers

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 6: Module 3 - "Expectation Gap" (Target vs Projected GPA)**

**Objective:** Test GPA comparison and pressure warnings.

**Steps:**
1. Locate the **"Expectation Gap"** section
2. Note the **Projected GPA** (calculated from your test data)
3. Change the **Target GPA** input

**Test Cases:**

| Target GPA | Gap Size | Expected Warning |
|------------|----------|------------------|
| 2.0 | Small (≤0.5) | No warning (if projected ≈ 2.0) |
| 1.5 | Medium (0.5-2.0) | 🟡 **"Challenge Zone"** badge |
| 4.0 | Large (>2.0) | 🔴 **"Unrealistic / High Pressure"** warning |

**Expected Behavior:**
- ✅ **Target GPA input:** Number field (1.0-4.0, step 0.1)
- ✅ **Projected GPA:** Green badge, auto-calculated, read-only
- ✅ Warning badge appears **immediately** when gap > 0.5
- ✅ Warning message changes based on gap size
- ✅ Warning card has appropriate color (amber or red)

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 7: Module 4 - "The Nemesis" (Subject Anxiety Selector)**

**Objective:** Test subject selection dropdown.

**Steps:**
1. Locate the **"The Nemesis"** dropdown
2. Click to open the dropdown
3. Select different subjects

**Expected Behavior:**
- ✅ Dropdown is **populated** with subjects from setup phase
- ✅ First option: **"None"**
- ✅ Subsequent options: All subject names from your test profile
- ✅ Selected subject is **highlighted** in dropdown
- ✅ Dropdown has proper styling (rounded, border, focus state)
- ✅ On **mobile:** Native picker appears (iOS/Android optimized)

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 8: Real-Time Risk Calculation**

**Objective:** Verify risk badge updates dynamically.

**Steps:**
1. Expand the widget
2. Note the **"Current Risk Level"** badge in the header
3. Perform the following actions sequentially:

**Action Sequence:**

| Action | Expected Risk Change | Badge Color |
|--------|---------------------|-------------|
| Initial state (default values) | LOW or MODERATE | Green or Orange |
| Set Sleep: `< 5h` | HIGH | Red |
| Set Sleep: `> 7h` | MODERATE or LOW | Orange or Green |
| Set Weekly hours: `30h` | HIGH | Red |
| Set Weekly hours: `8h` | MODERATE or LOW | Orange or Green |
| Set Target GPA: `4.0` (if projected is ~2.0) | HIGH | Red |
| Reset Target GPA: `2.0` | MODERATE or LOW | Orange or Green |

**Expected Behavior:**
- ✅ Badge updates **instantly** (no delay)
- ✅ Badge color matches risk level:
  - 🟢 **Green:** Low Risk
  - 🟡 **Orange:** Moderate Risk
  - 🔴 **Red:** High Risk
- ✅ **FAB ring color** (visible when widget is collapsed) also updates
- ✅ No console errors during updates

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 9: Close Widget & Re-Open**

**Objective:** Test widget state persistence during session.

**Steps:**
1. Expand the widget
2. Set the following:
   - Weekly hours: **25h**
   - Sleep: `< 5h`
   - Target GPA: **1.5**
   - Nemesis: **Mathematics**
3. Close the widget (click X or backdrop)
4. Wait 2 seconds
5. Re-open the widget

**Expected Behavior:**
- ✅ Widget **closes smoothly** (reverse animation)
- ✅ FAB reappears with breathing animation
- ✅ On re-opening, **all values are preserved:**
  - Weekly hours: still **25h**
  - Sleep: still `< 5h`
  - Target GPA: still **1.5**
  - Nemesis: still **Mathematics**
- ✅ Risk badge shows **same risk level** as before closing

**Pass Criteria:** All checkboxes above are ✅

---

### **Test 10: Page Refresh (Data Persistence)**

**Objective:** Verify psychosocial data persists across page reloads.

**Steps:**
1. Set all widget inputs to specific values
2. Note the current risk level
3. **Refresh the page** (Cmd+R or F5)
4. Re-open the widget

**Expected Behavior:**
- ⚠️ **Data does NOT persist** after refresh (expected behavior)
- ✅ Widget resets to **default values**:
  - Weekly hours: `10h`
  - Sleep: `5-7h`
  - Energy: `Good`
  - Target GPA: `2.0`
  - Nemesis: `None`

**Note:** This is **intentional** - psychosocial data is session-only and not saved to localStorage.

**Pass Criteria:** Widget resets to defaults after refresh

---

### **Test 11: Mobile Touch Targets**

**Objective:** Ensure all interactive elements meet accessibility standards.

**Steps:**
1. Use mobile device or Chrome DevTools device emulation
2. Test touch interactions on:
   - Slider thumb
   - Segmented control buttons
   - Dropdown
   - Close button

**Expected Behavior:**
- ✅ Slider thumb: **44x44px** (comfortable to tap)
- ✅ Segmented buttons: **44px height** minimum
- ✅ Close button (X): **40px** minimum
- ✅ Dropdown: **48px height** minimum
- ✅ All elements respond to **first touch** (no double-tap required)
- ✅ No accidental touches on nearby elements

**Pass Criteria:** All touch targets meet 44x44px minimum

---

### **Test 12: Cross-Browser Compatibility**

**Objective:** Verify widget works across major browsers.

**Browsers to Test:**
- ✅ Chrome (latest)
- ✅ Safari (latest)
- ✅ Firefox (latest)
- ✅ Edge (latest)

**Test Matrix:**

| Browser | FAB Visible | Expand/Collapse | Slider Works | Segmented Controls | Glassmorphism |
|---------|-------------|-----------------|--------------|-------------------|---------------|
| Chrome  | ☐          | ☐              | ☐           | ☐                | ☐            |
| Safari  | ☐          | ☐              | ☐           | ☐                | ☐            |
| Firefox | ☐          | ☐              | ☐           | ☐                | ☐            |
| Edge    | ☐          | ☐              | ☐           | ☐                | ☐            |

**Pass Criteria:** All checkboxes ✅ for all browsers

---

### **Test 13: Performance & Animations**

**Objective:** Ensure smooth 60fps performance.

**Steps:**
1. Open Chrome DevTools → Performance tab
2. Start recording
3. Drag the slider rapidly back and forth
4. Stop recording and analyze

**Expected Behavior:**
- ✅ **Frame rate:** ≥55fps during slider movement
- ✅ **No jank or stuttering** visible to eye
- ✅ Breathing animation is **smooth** (not jerky)
- ✅ Expand/collapse animations are **fluid**
- ✅ **No layout shifts** when opening/closing widget

**Pass Criteria:** Performance metrics meet targets

---

### **Test 14: Edge Cases & Error Handling**

**Objective:** Test boundary conditions and error states.

**Test Cases:**

#### Case A: No Subjects Available
1. Create a profile with **0 subjects** (if possible)
2. Open widget

**Expected:**
- ✅ Nemesis dropdown shows only **"None"** option
- ✅ No errors in console

#### Case B: Extreme Slider Values
1. Set slider to **0 hours**
2. Set slider to **40 hours**

**Expected:**
- ✅ Both extremes work correctly
- ✅ Track color updates appropriately

#### Case C: Invalid GPA Input
1. Try entering GPA: **0.5** (below minimum)
2. Try entering GPA: **5.0** (above maximum)

**Expected:**
- ✅ Input field **restricts** to 1.0-4.0 range
- ✅ No crashes or errors

**Pass Criteria:** All edge cases handled gracefully

---

## 🐛 Known Issues

### Non-Blocking Issues:
1. **Data Persistence:** Psychosocial data does NOT persist after page refresh (by design)
2. **TypeScript Warnings:** Pre-existing test file warnings (unrelated to widget)
3. **Node.js Deprecation:** Project uses Node 18 (Supabase recommends 20+)

### Blocking Issues:
- None identified in technical testing

---

## ✅ Test Completion Checklist

### Desktop Tests:
- [ ] Test 1: Widget Visibility
- [ ] Test 2: Expand Widget (Desktop)
- [ ] Test 4: The Squeeze Slider
- [ ] Test 5: Recovery Debt
- [ ] Test 6: Expectation Gap
- [ ] Test 7: The Nemesis
- [ ] Test 8: Real-Time Risk Calculation
- [ ] Test 9: Close & Re-Open
- [ ] Test 10: Page Refresh
- [ ] Test 13: Performance

### Mobile Tests:
- [ ] Test 3: Expand Widget (Mobile)
- [ ] Test 11: Touch Targets
- [ ] Test 4-7: All modules on mobile

### Cross-Browser:
- [ ] Test 12: Chrome
- [ ] Test 12: Safari
- [ ] Test 12: Firefox
- [ ] Test 12: Edge

### Edge Cases:
- [ ] Test 14: All edge cases

---

## 📊 Test Results Template

**Tester Name:** _______________
**Date:** _______________
**Browser:** _______________
**Device:** _______________

### Summary:
- **Tests Passed:** ___ / 14
- **Critical Issues Found:** ___
- **Minor Issues Found:** ___
- **Recommendations:**

___________________________________________
___________________________________________
___________________________________________

### Detailed Findings:

| Test # | Status | Notes |
|--------|--------|-------|
| 1      | ☐ Pass / ☐ Fail | |
| 2      | ☐ Pass / ☐ Fail | |
| 3      | ☐ Pass / ☐ Fail | |
| ...    | ...    | ... |

---

## 🔧 Troubleshooting

### Issue: Widget doesn't appear
**Solution:**
- Ensure you're on the `/report` page (not `/setup`)
- Check browser console for errors (F12)
- Verify profile exists in localStorage: `localStorage.getItem('arm_profile')`

### Issue: Slider doesn't move smoothly
**Solution:**
- Check CPU usage (background processes)
- Test in Chrome Incognito mode
- Disable browser extensions

### Issue: Glassmorphism effect not visible
**Solution:**
- Check browser supports `backdrop-filter` (all modern browsers)
- Inspect CSS in DevTools
- Try different background colors

### Issue: Mobile bottom sheet cuts off content
**Solution:**
- Check viewport height (should be `max-h-[85vh]`)
- Verify content is scrollable
- Test on different mobile devices

---

## 📞 Support

For issues or questions during testing:
- Check browser console for detailed error messages
- Refer to implementation docs: `/components/report/PulseWidget.tsx`
- Review context implementation: `/lib/contexts/ReportContext.tsx`

---

## 🎉 Post-Testing Actions

Once all tests pass:
1. ✅ Mark all checkboxes in completion checklist
2. 📝 Document any bugs or improvements in issue tracker
3. ✨ Consider enhancements:
   - localStorage persistence for psychosocial data
   - Subject highlighting when Nemesis is selected
   - Additional stress factor inputs
   - Export/share psychosocial risk report

---

**End of Testing Guide**
