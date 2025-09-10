import { useState, useRef, useEffect } from 'react';

export const useTypingIndicator = (group, socketService) => {
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const startTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            console.log('Starting typing for group:', group._id);
            socketService.startTyping(group._id);
        }
        
        // Clear existing timeout and set new one
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            console.log('Stopping typing (timeout) for group:', group._id);
            socketService.stopTyping(group._id);
        }, 2000);
    };

    const stopTyping = () => {
        if (isTyping) {
            setIsTyping(false);
            console.log('Stopping typing (manual) for group:', group._id);
            socketService.stopTyping(group._id);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleInputChange = (value) => {
        if (value.trim()) {
            startTyping();
        } else {
            stopTyping();
        }
    };

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (isTyping && group?._id) {
                socketService.stopTyping(group._id);
            }
        };
    }, [isTyping, group?._id, socketService]);

    return {
        isTyping,
        handleInputChange,
        stopTyping
    };
};
