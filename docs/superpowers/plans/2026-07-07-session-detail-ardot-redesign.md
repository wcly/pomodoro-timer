# Session Detail Ardot Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the session detail page so its structure and spacing match the Ardot design while keeping the existing per-app progress-bar color mapping intact.

**Architecture:** Keep the random usage-accent generation in the shared `UsageRow` component, but retune the detail-page markup and CSS so the page follows the Ardot frame hierarchy: title, session summary row, list header, stacked app rows, and bottom back action. Tests should lock the DOM ordering and shared-row assumptions before the implementation changes land.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, shared CSS in `src/App.css`

---

### Task 1: Lock the target layout in tests

**Files:**
- Modify: `src/features/pomodoro/__tests__/SessionDetailPage.test.tsx`
- Test: `src/features/pomodoro/__tests__/SessionDetailPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
const summaryLabels = Array.from(
  container.querySelectorAll<HTMLElement>(".detail-session-card__label"),
).map((node) => node.textContent);

expect(summaryLabels).toEqual(["时段", "总时长", "模式"]);
expect(container.querySelector(".detail-session-card__column--summary")).not.toBeInTheDocument();
expect(container.querySelector(".detail-columns")).toHaveTextContent("应用");
expect(container.querySelector(".detail-columns")).toHaveTextContent("时长");
expect(container.querySelector(".detail-columns")).toHaveTextContent("占比");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/pomodoro/__tests__/SessionDetailPage.test.tsx`
Expected: FAIL because the current summary order is `模式 / 时段 / 总时长` and the summary-specific class still exists.

- [ ] **Step 3: Keep the usage-row color behavior covered**

```tsx
const usageRows = container.querySelectorAll(".usage-row");
expect(usageRows[0]).toHaveClass("usage-row--framed");
expect(usageRows[0]).toHaveStyle({ "--usage-accent": expect.any(String) });
```

- [ ] **Step 4: Re-run the focused test after implementation**

Run: `npm test -- src/features/pomodoro/__tests__/SessionDetailPage.test.tsx`
Expected: PASS

### Task 2: Rebuild the page structure and spacing

**Files:**
- Modify: `src/features/pomodoro/screens/SessionDetailPage.tsx`
- Modify: `src/App.css`
- Test: `src/features/pomodoro/__tests__/PomodoroApp.test.tsx`

- [ ] **Step 1: Update the JSX structure to match the Ardot section order**

```tsx
<div className="detail-session-card">
  <div className="detail-session-card__column">
    <span className="detail-session-card__label">时段</span>
    <strong className="detail-session-card__value">{buildSessionRangeLabel(...)}</strong>
  </div>
  <div className="detail-session-card__column">
    <span className="detail-session-card__label">总时长</span>
    <strong className="detail-session-card__value">{formatDuration(...)}</strong>
  </div>
  <div className="detail-session-card__column">
    <span className="detail-session-card__label">模式</span>
    <strong className="detail-session-card__value">{timerModeLabels[...]}</strong>
  </div>
</div>
```

- [ ] **Step 2: Retune detail-page CSS to the Ardot measurements**

```css
.detail-frame {
  min-height: 700px;
  padding: 36px 40px 34px;
  display: flex;
  flex-direction: column;
}

.detail-session-card {
  min-height: 78px;
  margin-bottom: 28px;
  padding: 20px;
  background: transparent;
  color: var(--ink);
}

.usage-row__top {
  grid-template-columns: minmax(0, 1fr) 56px 40px;
}
```

- [ ] **Step 3: Keep the back action pinned to the bottom section**

```css
.usage-list--detailed {
  flex: 1 1 auto;
}

.detail-actions {
  margin-top: 28px;
}
```

- [ ] **Step 4: Confirm the app flow test still asserts the detail page contract**

```tsx
expect(screen.getByText("模式")).toBeInTheDocument();
expect(screen.getByText("时段")).toBeInTheDocument();
expect(screen.getByText("总时长")).toBeInTheDocument();
```

### Task 3: Verify the redesign end to end

**Files:**
- Test: `src/features/pomodoro/__tests__/SessionDetailPage.test.tsx`
- Test: `src/features/pomodoro/__tests__/PomodoroApp.test.tsx`
- Test: `src/features/pomodoro/__tests__/UsageRow.test.tsx`

- [ ] **Step 1: Run the focused regression tests**

Run: `npm test -- src/features/pomodoro/__tests__/SessionDetailPage.test.tsx src/features/pomodoro/__tests__/PomodoroApp.test.tsx src/features/pomodoro/__tests__/UsageRow.test.tsx`
Expected: PASS with 0 failures.

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm test`
Expected: PASS with 0 failures.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: exit code 0 and a generated Vite bundle.
