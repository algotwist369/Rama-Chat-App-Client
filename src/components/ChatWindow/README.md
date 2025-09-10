# ChatWindow Component Structure

This directory contains the refactored ChatWindow component, broken down into smaller, more manageable pieces for better maintainability, performance, and readability.

## Structure

```
ChatWindow/
├── ChatHeader.jsx         # Header with group info and online members
├── MessageSelectionBar.jsx # Bulk message operations bar
├── MessagesList.jsx       # Messages display and scroll management
├── MessageInput.jsx       # Message input with file upload and emoji
├── components.js          # Export file for all sub-components
└── README.md             # This documentation

../ChatWindow.jsx          # Main ChatWindow component (uses all sub-components and hooks)
```

## Custom Hooks

The component uses several custom hooks located in `/src/hooks/`:

### useSocketListeners
- Manages socket connections for online status and typing indicators
- Handles user online/offline events
- Manages typing start/stop events
- Provides periodic refresh of online status

### useTypingIndicator
- Manages typing state and timeouts
- Handles typing start/stop logic
- Provides input change handler with typing detection

### useFileUpload
- Manages file selection and upload state
- Handles drag and drop functionality
- Provides file validation and progress tracking
- Includes file icon and size formatting utilities

### useScrollManagement
- Manages scroll position and auto-scroll behavior
- Tracks new message count when not at bottom
- Handles load more messages on scroll
- Provides scroll to bottom functionality

### useMessageSelection
- Manages message selection state
- Provides selection toggle and bulk operations
- Tracks selected message count and IDs

## Performance Optimizations

- **React.memo**: All sub-components are wrapped with React.memo to prevent unnecessary re-renders
- **useCallback**: Event handlers are memoized to prevent child re-renders
- **useMemo**: Expensive calculations like message grouping are memoized
- **Custom Hooks**: Logic is separated into reusable hooks for better performance and testing

## Benefits

1. **Maintainability**: Each component has a single responsibility
2. **Reusability**: Custom hooks can be reused in other components
3. **Performance**: Optimized with React.memo and useCallback
4. **Testability**: Smaller components and hooks are easier to test
5. **Readability**: Code is more organized and easier to understand
6. **Scalability**: Easy to add new features or modify existing ones

## Usage

The main ChatWindow component maintains the same API as before, so no changes are needed in parent components. The refactoring is completely internal and transparent to consumers.

```jsx
import ChatWindow from './components/ChatWindow';

// Usage remains the same
<ChatWindow
  group={group}
  messages={messages}
  currentUser={currentUser}
  // ... other props
/>
```

## Implementation Details

The main `ChatWindow.jsx` file now directly imports and uses:
- All custom hooks from `/src/hooks/`
- All sub-components from `/src/components/ChatWindow/`
- Maintains the same external API for backward compatibility
- Provides better performance through React.memo and useCallback optimizations
