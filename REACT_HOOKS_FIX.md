# React Hooks Error Fix

## ✅ Issue Resolved

Fixed the **"Invalid hook call"** error in the frontend application.

---

## 🐛 The Problem

**Error Message:**
```
Invalid hook call. Hooks can only be called inside of the body of a function component.
Error at: authenticated-app.tsx:114
```

**Root Cause:**
The `useModel()` hook was being called **inside** the `handleNewChatMessage` function (line 62), which is an event handler, not a React component.

```typescript
// ❌ WRONG - Hook called inside a regular function
const handleNewChatMessage = async (message: { text: string }) => {
  const { selectedModel } = useModel(); // ❌ ERROR!
  // ...
}
```

---

## ✅ The Fix

**Solution:**
Moved the `useModel()` hook call to the **top level** of the `AuthenticatedCore` component, then use the value inside the event handler.

```typescript
// ✅ CORRECT - Hook called at component level
const AuthenticatedCore = ({ user, onLogout }: AuthenticatedAppProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { client, setActiveChannel } = useChatContext();
  const { selectedModel } = useModel(); // ✅ Called at top level
  
  const handleNewChatMessage = async (message: { text: string }) => {
    // ✅ Use the selectedModel value directly
    console.log("Selected model:", selectedModel);
    // ...
  };
}
```

---

## 📝 What Changed

**File:** `frontend/src/components/authenticated-app.tsx`

### Change 1: Add hook at component level (line 41)
```typescript
const { selectedModel } = useModel(); // ✅ Move hook to top level
```

### Change 2: Remove hook call from function (line 62)
```typescript
// Before:
const { selectedModel } = useModel(); // ❌ Remove this

// After:
// Use the selected model from the hook called at component level ✅
```

---

## 🎯 Why This Matters

### Rules of Hooks
React hooks **MUST** follow these rules:
1. ✅ **Only call hooks at the top level** (not in loops, conditions, or nested functions)
2. ✅ **Only call hooks from React components** (or custom hooks)

### What Hooks Can't Be Called Inside
- ❌ Event handlers (like `handleNewChatMessage`)
- ❌ Callbacks passed to `useEffect`, `setTimeout`, etc.
- ❌ Regular JavaScript functions
- ❌ Conditional statements
- ❌ Loops

### Where Hooks CAN Be Called
- ✅ Top level of function components
- ✅ Top level of custom hooks
- ✅ Before any early returns

---

## 🧪 Testing

### Before Fix
```
❌ Console Error: Invalid hook call
❌ Chat creation fails
❌ Connection issues
```

### After Fix
```
✅ No console errors
✅ Chat creation works
✅ Model selection persists
✅ Smooth user experience
```

---

## 📚 Related Issues

This fix ensures:
- ✅ Model selection works when creating new chats
- ✅ No React hook errors in console
- ✅ Proper hook usage following React guidelines
- ✅ Stable component behavior

---

## 🔗 References

- [React Hooks Rules](https://reactjs.org/docs/hooks-rules.html)
- [Invalid Hook Call Warning](https://reactjs.org/link/invalid-hook-call)

---

**Status**: ✅ **FIXED**
**Date**: October 1, 2025
