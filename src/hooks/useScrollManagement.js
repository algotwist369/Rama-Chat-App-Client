import { useState, useRef, useEffect } from 'react';

export const useScrollManagement = (messages, currentUser, hasMoreMessages, loadingMore, onLoadMore) => {
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [newMessagesCount, setNewMessagesCount] = useState(0);
    const [lastScrollPosition, setLastScrollPosition] = useState(0);
    
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const isLastMessageFromCurrentUser = lastMessage?.senderId?._id === currentUser.id || 
                                               lastMessage?.senderId === currentUser.id;
            
            if (isAtBottom) {
                // User is at bottom - auto-scroll for all new messages
                scrollToBottom();
                setNewMessagesCount(0); // Reset counter when at bottom
            } else {
                // User is reading older messages - don't auto-scroll
                if (!isLastMessageFromCurrentUser) {
                    // Count new messages from others
                    setNewMessagesCount(prev => prev + 1);
                }
            }
        }
    }, [messages, isAtBottom, currentUser.id]);

    // Check if user is at bottom of messages
    const checkIfAtBottom = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const threshold = 150; // Increased threshold for better UX
            const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
            setIsAtBottom(atBottom);
            
            // Always show scroll button when not at bottom (if there are messages)
            setShowScrollButton(!atBottom && messages.length > 0);
            
            // Reset new messages count when user scrolls to bottom
            if (atBottom) {
                setNewMessagesCount(0);
            }
        }
    };

    // Scroll to bottom function
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Handle scroll events
    const handleScroll = () => {
        checkIfAtBottom();
        
        // Load more messages when scrolling to top
        if (messagesContainerRef.current && hasMoreMessages && !loadingMore) {
            const { scrollTop } = messagesContainerRef.current;
            if (scrollTop < 100) { // Near the top
                onLoadMore();
            }
        }
        
        // Clear notifications when user scrolls to see new messages
        if (newMessagesCount > 0 && !isAtBottom && messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            
            // If user is scrolling down (towards new messages), clear notifications
            if (scrollTop > lastScrollPosition) {
                // User is scrolling down to see new messages - clear notifications
                setNewMessagesCount(0);
            }
            
            // Update last scroll position
            setLastScrollPosition(scrollTop);
            
            // Also clear if user scrolls more than 30% down
            const scrollProgress = scrollTop / (scrollHeight - clientHeight);
            if (scrollProgress > 0.3) {
                setNewMessagesCount(0);
            }
        }
    };

    // Auto-scroll when group changes or component mounts
    const resetScroll = () => {
        if (messages.length > 0) {
            setIsAtBottom(true);
            setTimeout(scrollToBottom, 100);
        }
    };

    const handleScrollToBottom = () => {
        scrollToBottom();
        setNewMessagesCount(0);
        setIsAtBottom(true);
    };

    return {
        showScrollButton,
        isAtBottom,
        newMessagesCount,
        messagesEndRef,
        messagesContainerRef,
        handleScroll,
        resetScroll,
        handleScrollToBottom
    };
};
