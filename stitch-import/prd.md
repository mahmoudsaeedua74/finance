# Personal Finance Redesign - Information Architecture & UX Strategy

## 1. Information Architecture (IA) Map

### Core Navigation (Sidebar/Top Nav)
*   **Dashboard:** High-level summary, quick insights, and recent activity.
*   **Income:** Tabbed view for Income List and Recurring Templates.
*   **Expenses:** Tabbed view for Expense List and Recurring Rules.
*   **Projects:** Portfolio view of active/completed project payouts and balances.
*   **Gold Tracking:** Real-time portfolio value and manual overrides.
*   **Reports:** Deep-dive analytics with robust filtering (Monthly, Yearly, All-time).
*   **Settings:** Profile, Notifications, and System Preferences.

### User Flows (High Priority)
1.  **Quick Add:** Global "Add" button for rapid income/expense entry.
2.  **Report Generation:** Filter -> View -> Export (PDF/Excel/Email).
3.  **Gold Management:** Toggle between live and manual price overrides.
4.  **Monthly Closing:** Automated workflow for reviewing and finalizing the previous month's data.

---

## 2. Design System Tokens (The Foundation)

### Color Palette (Fintech-Focused)
*   **Primary:** Deep Navy (#0F172A) for trust and professionalism.
*   **Secondary:** Emerald Green (#10B981) for growth/income.
*   **Accent:** Rose/Amber (#F43F5E / #F59E0B) for expenses and alerts.
*   **Neutral:** Cool Grays (Slate series) for background and text.
*   **Success/Error/Warning:** Industry-standard semantic colors with high accessibility contrast.

### Typography (Inter or SF Pro)
*   **Display:** 32px / 24px (Bold) - Large financial totals.
*   **Header:** 20px / 18px (Semibold) - Section titles.
*   **Body:** 16px (Regular) - General text.
*   **Caption:** 14px / 12px (Medium) - Table headers and metadata.

### System Rules
*   **Grid:** 12-column desktop grid / 4-column mobile grid.
*   **Spacing:** 8px base unit (4, 8, 16, 24, 32, 48, 64).
*   **Radius:** 8px (Standard Cards) / 12px (Interactive Elements).
*   **RTL Support:** Proper mirroring for Arabic localization, ensuring icon directionality (e.g., arrows) is correct for the reading flow.

---

## 3. Component Inventory

*   **Inputs:** Standard Text, Currency (with prefix/suffix), Select (Searchable), Date Picker (with recurring logic support).
*   **Data Display:** Metric Cards (with sparklines), Data Tables (Sortable/Filterable), Progress Bars, Badge/Status indicators.
*   **Feedback:** Toasts, Modal Dialogs, Loading Skeletons, Empty State Illustrations.
*   **Navigation:** Vertical Sidebar (Desktop), Bottom Tab Bar (Mobile), Breadcrumbs.
*   **Specialty:** Chart Containers (Line, Pie, Bar), Filter Side-panel, Notification Inbox Card.

---

## 4. Screen Blueprint (The Roadmap)

1.  **Auth:** Clean, centered forms for Login/Register.
2.  **Dashboard:** The "Control Center" with large net-worth metrics and quick-action widgets.
3.  **Transaction Modules:** Unified list views for Income and Expenses with robust inline editing.
4.  **Gold Portfolio:** A specialized dashboard for precious metals with "Live Status" indicators.
5.  **Reports Module:** A two-pane layout with persistent filters on the left/top and data visualizations on the right.
6.  **Settings:** Categorized configuration sections (e.g., "Notification Preferences").

---

## 5. Visual Direction & Handoff Notes

*   **Style:** Clean, modern fintech. Focus on whitespace and typography to handle dense data.
*   **Dev Notes:** 
    *   Use Tailwind CSS for token implementation.
    *   Implement Lucide Icons (RTL-aware).
    *   Charts to be built with Recharts or Chart.js for responsive performance.
    *   Prioritize `Intl.NumberFormat` for multi-currency and locale-aware number formatting.