import { useState } from 'react';

export const useMessageSelection = () => {
    const [selectedMessages, setSelectedMessages] = useState(new Set());

    const toggleMessageSelection = (messageId) => {
        setSelectedMessages(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(messageId)) {
                newSelected.delete(messageId);
            } else {
                newSelected.add(messageId);
            }
            return newSelected;
        });
    };

    const clearSelection = () => {
        setSelectedMessages(new Set());
    };

    const isMessageSelected = (messageId) => {
        return selectedMessages.has(messageId);
    };

    const getSelectedCount = () => {
        return selectedMessages.size;
    };

    const getSelectedMessageIds = () => {
        return Array.from(selectedMessages);
    };

    return {
        selectedMessages,
        toggleMessageSelection,
        clearSelection,
        isMessageSelected,
        getSelectedCount,
        getSelectedMessageIds
    };
};
