import React from 'react';
import { Trash2 } from 'lucide-react';

const MessageSelectionBar = React.memo(({ 
    selectedCount, 
    onDeleteSelected, 
    onClearSelection 
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="px-4 py-3 border-b border-gray-200 bg-blue-50 flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-blue-900">
                        {selectedCount} message{selectedCount > 1 ? 's' : ''} selected
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onDeleteSelected}
                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                    </button>
                    <button
                        onClick={onClearSelection}
                        className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
});

MessageSelectionBar.displayName = 'MessageSelectionBar';

export default MessageSelectionBar;
